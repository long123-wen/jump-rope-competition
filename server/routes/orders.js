const express = require('express');
const { db } = require('../database');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const ExcelJS = require('exceljs');

const router = express.Router();

// 自动编排出场顺序（管理员）
router.post('/generate', verifyAdmin, (req, res) => {
  try {
    const { categoryId, groupId } = req.query;

    if (!categoryId || !groupId) {
      return res.status(400).json({ code: 400, message: '项目ID和分组ID不能为空' });
    }

    // 获取已确认的报名记录，按报名时间排序
    const registrations = db.prepare(`
      SELECT r.id, r.athleteId
      FROM registrations r
      WHERE r.categoryId = ? AND r.groupId = ? AND r.status = '已确认'
      ORDER BY r.createdAt ASC
    `).all(categoryId, groupId);

    if (registrations.length === 0) {
      return res.status(400).json({ code: 400, message: '没有已确认的报名记录' });
    }

    // 删除已有的出场顺序
    db.prepare('DELETE FROM orders WHERE categoryId = ? AND groupId = ?').run(categoryId, groupId);

    // 生成出场顺序
    const insert = db.prepare(
      'INSERT INTO orders (sequence, categoryId, groupId, athleteId, registrationId) VALUES (?, ?, ?, ?, ?)'
    );

    const transaction = db.transaction((items) => {
      items.forEach((reg, index) => {
        insert.run(index + 1, categoryId, groupId, reg.athleteId, reg.id);
      });
    });

    transaction(registrations);

    res.json({
      code: 200,
      message: `成功编排${registrations.length}名选手的出场顺序`,
      data: { count: registrations.length }
    });
  } catch (err) {
    console.error('编排出场顺序失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取出场顺序
router.get('/', verifyToken, (req, res) => {
  try {
    const { categoryId, groupId } = req.query;

    if (!categoryId || !groupId) {
      return res.status(400).json({ code: 400, message: '项目ID和分组ID不能为空' });
    }

    const orders = db.prepare(`
      SELECT o.*, a.name as athleteName, a.gender as athleteGender,
             u.orgName, u.orgType
      FROM orders o
      JOIN athletes a ON o.athleteId = a.id
      JOIN registrations r ON o.registrationId = r.id
      JOIN users u ON r.userId = u.id
      WHERE o.categoryId = ? AND o.groupId = ?
      ORDER BY o.sequence ASC
    `).all(categoryId, groupId);

    res.json({ code: 200, data: orders });
  } catch (err) {
    console.error('获取出场顺序失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取完整秩序册
router.get('/program', verifyToken, (req, res) => {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({ code: 400, message: '赛事ID不能为空' });
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ code: 404, message: '赛事不存在' });
    }

    // 获取所有项目
    const categories = db.prepare(
      'SELECT * FROM categories WHERE eventId = ? ORDER BY type, name'
    ).all(eventId);

    const program = [];

    for (const category of categories) {
      // 获取该项目的所有分组
      const groups = db.prepare(
        'SELECT * FROM groups WHERE eventId = ? ORDER BY categoryType, name'
      ).all(eventId);

      for (const group of groups) {
        // 获取该分组该项目的出场顺序
        const orders = db.prepare(`
          SELECT o.*, a.name as athleteName, a.gender as athleteGender, a.birthDate, a.idCard,
                 u.orgName, u.orgType, u.realName as userName, u.phone
          FROM orders o
          JOIN athletes a ON o.athleteId = a.id
          JOIN registrations r ON o.registrationId = r.id
          JOIN users u ON r.userId = u.id
          WHERE o.categoryId = ? AND o.groupId = ?
          ORDER BY o.sequence ASC
        `).all(category.id, group.id);

        if (orders.length > 0) {
          program.push({
            categoryName: category.name,
            categoryType: category.type,
            groupId: group.id,
            groupName: group.name,
            groupCategoryType: group.categoryType,
            athletes: orders
          });
        }
      }
    }

    res.json({
      code: 200,
      data: {
        event,
        program
      }
    });
  } catch (err) {
    console.error('获取秩序册失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 导出秩序册Excel（管理员）
router.get('/program/export', verifyAdmin, async (req, res) => {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({ code: 400, message: '赛事ID不能为空' });
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ code: 404, message: '赛事不存在' });
    }

    // 获取所有项目
    const categories = db.prepare(
      'SELECT * FROM categories WHERE eventId = ? ORDER BY type, name'
    ).all(eventId);

    const workbook = new ExcelJS.Workbook();
    let currentRow = 1;

    // 添加封面信息
    const coverSheet = workbook.addWorksheet('秩序册');
    coverSheet.mergeCells('A1:G1');
    coverSheet.getCell('A1').value = event.name + ' - 秩序册';
    coverSheet.getCell('A1').font = { size: 18, bold: true };
    coverSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    coverSheet.getRow(1).height = 40;

    coverSheet.mergeCells('A2:G2');
    coverSheet.getCell('A2').value = `比赛地点: ${event.location || '待定'}`;
    coverSheet.getCell('A2').font = { size: 12 };
    coverSheet.getCell('A2').alignment = { horizontal: 'center' };

    coverSheet.mergeCells('A3:G3');
    coverSheet.getCell('A3').value = `比赛时间: ${event.startDate} 至 ${event.endDate}`;
    coverSheet.getCell('A3').font = { size: 12 };
    coverSheet.getCell('A3').alignment = { horizontal: 'center' };

    // 为每个项目+分组创建一个工作表
    for (const category of categories) {
      const groups = db.prepare(
        'SELECT * FROM groups WHERE eventId = ? ORDER BY categoryType, name'
      ).all(eventId);

      for (const group of groups) {
        const orders = db.prepare(`
          SELECT o.sequence, a.name as athleteName, a.gender as athleteGender, a.birthDate, a.idCard,
                 u.orgName, u.orgType, u.realName as userName
          FROM orders o
          JOIN athletes a ON o.athleteId = a.id
          JOIN registrations r ON o.registrationId = r.id
          JOIN users u ON r.userId = u.id
          WHERE o.categoryId = ? AND o.groupId = ?
          ORDER BY o.sequence ASC
        `).all(category.id, group.id);

        if (orders.length === 0) continue;

        // 工作表名称限制31字符
        const sheetName = `${category.name}-${group.name}`.substring(0, 31);
        const worksheet = workbook.addWorksheet(sheetName);

        // 标题行
        worksheet.mergeCells('A1:G1');
        worksheet.getCell('A1').value = `${category.name} - ${group.name}`;
        worksheet.getCell('A1').font = { size: 14, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 30;

        // 设置列
        worksheet.columns = [
          { header: '出场顺序', key: 'sequence', width: 10 },
          { header: '运动员姓名', key: 'athleteName', width: 14 },
          { header: '性别', key: 'athleteGender', width: 6 },
          { header: '出生日期', key: 'birthDate', width: 12 },
          { header: '身份证号', key: 'idCard', width: 20 },
          { header: '所属机构', key: 'orgName', width: 20 },
          { header: '机构类型', key: 'orgType', width: 10 },
        ];

        // 添加数据
        orders.forEach((order) => {
          worksheet.addRow({
            sequence: order.sequence,
            athleteName: order.athleteName,
            athleteGender: order.athleteGender,
            birthDate: order.birthDate,
            idCard: order.idCard,
            orgName: order.orgName,
            orgType: order.orgType,
          });
        });

        // 设置表头样式
        worksheet.getRow(2).font = { bold: true };
        worksheet.getRow(2).alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }

    // 设置响应头
    const fileName = encodeURIComponent(`${event.name}_秩序册.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('导出秩序册失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
