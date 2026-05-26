const express = require('express');
const { db } = require('../database');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const ExcelJS = require('exceljs');

const router = express.Router();

// 获取报名列表（管理员）
router.get('/', verifyAdmin, (req, res) => {
  try {
    const { userId, eventId } = req.query;

    let query = `
      SELECT r.*, u.orgName, u.orgType, u.realName as userName, u.phone,
             a.name as athleteName, a.gender as athleteGender, a.birthDate, a.idCard,
             c.name as categoryName, c.type as categoryType, c.fee,
             g.name as groupName, g.categoryType as groupCategoryType,
             e.name as eventName
      FROM registrations r
      JOIN users u ON r.userId = u.id
      JOIN athletes a ON r.athleteId = a.id
      JOIN categories c ON r.categoryId = c.id
      JOIN groups g ON r.groupId = g.id
      JOIN events e ON r.eventId = e.id
      WHERE 1=1
    `;
    const params = [];

    if (userId) {
      query += ' AND r.userId = ?';
      params.push(userId);
    }
    if (eventId) {
      query += ' AND r.eventId = ?';
      params.push(eventId);
    }

    query += ' ORDER BY r.createdAt DESC';

    const registrations = db.prepare(query).all(...params);
    res.json({ code: 200, data: registrations });
  } catch (err) {
    console.error('获取报名列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取我的报名（用户）
router.get('/my', verifyToken, (req, res) => {
  try {
    const { eventId } = req.query;
    const userId = req.user.id;

    let query = `
      SELECT r.*, a.name as athleteName, a.gender as athleteGender, a.birthDate, a.idCard,
             c.name as categoryName, c.type as categoryType, c.fee,
             g.name as groupName, g.categoryType as groupCategoryType,
             e.name as eventName
      FROM registrations r
      JOIN athletes a ON r.athleteId = a.id
      JOIN categories c ON r.categoryId = c.id
      JOIN groups g ON r.groupId = g.id
      JOIN events e ON r.eventId = e.id
      WHERE r.userId = ?
    `;
    const params = [userId];

    if (eventId) {
      query += ' AND r.eventId = ?';
      params.push(eventId);
    }

    query += ' ORDER BY r.createdAt DESC';

    const registrations = db.prepare(query).all(...params);
    res.json({ code: 200, data: registrations });
  } catch (err) {
    console.error('获取我的报名失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 提交报名（用户）
router.post('/', verifyToken, (req, res) => {
  try {
    const { eventId, categoryId, groupId, athleteId } = req.body;
    const userId = req.user.id;

    if (!eventId || !categoryId || !groupId || !athleteId) {
      return res.status(400).json({ code: 400, message: '赛事ID、项目ID、分组ID和运动员ID不能为空' });
    }

    // 检查赛事状态
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ code: 404, message: '赛事不存在' });
    }
    if (event.status !== '报名中') {
      return res.status(400).json({ code: 400, message: '该赛事当前不在报名状态' });
    }

    // 检查运动员是否属于当前用户
    const athlete = db.prepare('SELECT * FROM athletes WHERE id = ? AND userId = ?').get(athleteId, userId);
    if (!athlete) {
      return res.status(403).json({ code: 403, message: '运动员不存在或不属于当前用户' });
    }

    // 检查项目和分组是否属于该赛事
    const category = db.prepare('SELECT * FROM categories WHERE id = ? AND eventId = ?').get(categoryId, eventId);
    if (!category) {
      return res.status(400).json({ code: 400, message: '项目不存在或不属于该赛事' });
    }

    const group = db.prepare('SELECT * FROM groups WHERE id = ? AND eventId = ?').get(groupId, eventId);
    if (!group) {
      return res.status(400).json({ code: 400, message: '分组不存在或不属于该赛事' });
    }

    // 检查是否已报名（同一运动员同一项目同一分组）
    const existing = db.prepare(
      'SELECT id FROM registrations WHERE userId = ? AND eventId = ? AND categoryId = ? AND groupId = ? AND athleteId = ? AND status != ?'
    ).get(userId, eventId, categoryId, groupId, athleteId, '已退赛');
    if (existing) {
      return res.status(400).json({ code: 400, message: '该运动员已报名此项目此分组' });
    }

    // 检查限报数量
    const limit = db.prepare(
      'SELECT maxParticipants FROM category_group_limits WHERE categoryId = ? AND groupId = ?'
    ).get(categoryId, groupId);

    if (limit && limit.maxParticipants > 0) {
      const currentCount = db.prepare(
        'SELECT COUNT(*) as count FROM registrations WHERE categoryId = ? AND groupId = ? AND status != ?'
      ).get(categoryId, groupId, '已退赛');

      if (currentCount.count >= limit.maxParticipants) {
        return res.status(400).json({ code: 400, message: '该分组报名人数已满' });
      }
    }

    const result = db.prepare(
      'INSERT INTO registrations (userId, eventId, categoryId, groupId, athleteId) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, eventId, categoryId, groupId, athleteId);

    const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(result.lastInsertRowid);
    res.json({ code: 200, message: '报名成功', data: registration });
  } catch (err) {
    console.error('提交报名失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 更新报名状态（管理员）
router.put('/:id/status', verifyAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['待确认', '已确认', '已退赛'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ code: 400, message: '无效的报名状态' });
    }

    const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(id);
    if (!registration) {
      return res.status(404).json({ code: 404, message: '报名记录不存在' });
    }

    db.prepare('UPDATE registrations SET status = ? WHERE id = ?').run(status, id);
    const updated = db.prepare('SELECT * FROM registrations WHERE id = ?').get(id);
    res.json({ code: 200, message: '报名状态更新成功', data: updated });
  } catch (err) {
    console.error('更新报名状态失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 取消报名（用户）
router.delete('/:id', verifyToken, (req, res) => {
  try {
    const { id } = req.params;

    const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(id);
    if (!registration) {
      return res.status(404).json({ code: 404, message: '报名记录不存在' });
    }

    // 普通用户只能取消自己的报名
    if (req.user.role !== 'admin' && registration.userId !== req.user.id) {
      return res.status(403).json({ code: 403, message: '无权取消此报名' });
    }

    db.prepare('DELETE FROM registrations WHERE id = ?').run(id);
    res.json({ code: 200, message: '报名取消成功' });
  } catch (err) {
    console.error('取消报名失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 导出报名详情Excel（管理员）
router.get('/export', verifyAdmin, async (req, res) => {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({ code: 400, message: '赛事ID不能为空' });
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ code: 404, message: '赛事不存在' });
    }

    const registrations = db.prepare(`
      SELECT r.*, u.orgName, u.orgType, u.realName as userName, u.phone,
             a.name as athleteName, a.gender as athleteGender, a.birthDate, a.idCard,
             c.name as categoryName, c.type as categoryType, c.fee,
             g.name as groupName, g.categoryType as groupCategoryType
      FROM registrations r
      JOIN users u ON r.userId = u.id
      JOIN athletes a ON r.athleteId = a.id
      JOIN categories c ON r.categoryId = c.id
      JOIN groups g ON r.groupId = g.id
      WHERE r.eventId = ?
      ORDER BY c.name, g.name, r.createdAt
    `).all(eventId);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('报名详情');

    // 设置列
    worksheet.columns = [
      { header: '序号', key: 'index', width: 6 },
      { header: '机构类型', key: 'orgType', width: 10 },
      { header: '机构名称', key: 'orgName', width: 20 },
      { header: '报名人', key: 'userName', width: 10 },
      { header: '联系电话', key: 'phone', width: 14 },
      { header: '运动员姓名', key: 'athleteName', width: 12 },
      { header: '性别', key: 'athleteGender', width: 6 },
      { header: '出生日期', key: 'birthDate', width: 12 },
      { header: '身份证号', key: 'idCard', width: 20 },
      { header: '项目名称', key: 'categoryName', width: 16 },
      { header: '项目类型', key: 'categoryType', width: 10 },
      { header: '报名费', key: 'fee', width: 10 },
      { header: '分组名称', key: 'groupName', width: 12 },
      { header: '分组类型', key: 'groupCategoryType', width: 10 },
      { header: '报名状态', key: 'status', width: 10 },
      { header: '报名时间', key: 'createdAt', width: 18 },
    ];

    // 添加数据
    registrations.forEach((reg, index) => {
      worksheet.addRow({
        index: index + 1,
        orgType: reg.orgType,
        orgName: reg.orgName,
        userName: reg.userName,
        phone: reg.phone,
        athleteName: reg.athleteName,
        athleteGender: reg.athleteGender,
        birthDate: reg.birthDate,
        idCard: reg.idCard,
        categoryName: reg.categoryName,
        categoryType: reg.categoryType,
        fee: reg.fee,
        groupName: reg.groupName,
        groupCategoryType: reg.groupCategoryType,
        status: reg.status,
        createdAt: reg.createdAt,
      });
    });

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // 设置响应头
    const fileName = encodeURIComponent(`${event.name}_报名详情.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('导出报名详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
