const express = require('express');
const { db } = require('../database');
const { verifyAdmin, verifyToken } = require('../middleware/auth');

const router = express.Router();

// 获取分组列表
router.get('/', verifyToken, (req, res) => {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({ code: 400, message: '赛事ID不能为空' });
    }

    const groups = db.prepare(
      'SELECT * FROM groups WHERE eventId = ? ORDER BY categoryType, createdAt'
    ).all(eventId);

    res.json({ code: 200, data: groups });
  } catch (err) {
    console.error('获取分组列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 创建分组（管理员）
router.post('/', verifyAdmin, (req, res) => {
  try {
    const { eventId, categoryType, name, description } = req.body;

    if (!eventId || !categoryType || !name) {
      return res.status(400).json({ code: 400, message: '赛事ID、分组类型和分组名称不能为空' });
    }

    const validTypes = ['性别分组', '类型分组'];
    if (!validTypes.includes(categoryType)) {
      return res.status(400).json({ code: 400, message: '分组类型只能是"性别分组"或"类型分组"' });
    }

    const event = db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ code: 404, message: '赛事不存在' });
    }

    const result = db.prepare(
      'INSERT INTO groups (eventId, categoryType, name, description) VALUES (?, ?, ?, ?)'
    ).run(eventId, categoryType, name, description || '');

    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(result.lastInsertRowid);
    res.json({ code: 200, message: '分组创建成功', data: group });
  } catch (err) {
    console.error('创建分组失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 更新分组（管理员）
router.put('/:id', verifyAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { categoryType, name, description } = req.body;

    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    if (!group) {
      return res.status(404).json({ code: 404, message: '分组不存在' });
    }

    if (categoryType) {
      const validTypes = ['性别分组', '类型分组'];
      if (!validTypes.includes(categoryType)) {
        return res.status(400).json({ code: 400, message: '分组类型只能是"性别分组"或"类型分组"' });
      }
    }

    db.prepare(`
      UPDATE groups SET
        categoryType = COALESCE(?, categoryType),
        name = COALESCE(?, name),
        description = COALESCE(?, description)
      WHERE id = ?
    `).run(categoryType ?? null, name ?? null, description ?? null, id);

    const updatedGroup = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    res.json({ code: 200, message: '分组更新成功', data: updatedGroup });
  } catch (err) {
    console.error('更新分组失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 删除分组（管理员）
router.delete('/:id', verifyAdmin, (req, res) => {
  try {
    const { id } = req.params;

    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    if (!group) {
      return res.status(404).json({ code: 404, message: '分组不存在' });
    }

    db.prepare('DELETE FROM groups WHERE id = ?').run(id);
    res.json({ code: 200, message: '分组删除成功' });
  } catch (err) {
    console.error('删除分组失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 设置项目分组限报数量（管理员）
router.post('/limits', verifyAdmin, (req, res) => {
  try {
    const { limits } = req.body; // [{ categoryId, groupId, maxParticipants }]

    if (!limits || !Array.isArray(limits) || limits.length === 0) {
      return res.status(400).json({ code: 400, message: '限报数据不能为空' });
    }

    const insertOrUpdate = db.prepare(`
      INSERT INTO category_group_limits (categoryId, groupId, maxParticipants)
      VALUES (?, ?, ?)
      ON CONFLICT(categoryId, groupId) DO UPDATE SET maxParticipants = excluded.maxParticipants
    `);

    const transaction = db.transaction((items) => {
      for (const item of items) {
        if (!item.categoryId || !item.groupId) {
          throw new Error('项目ID和分组ID不能为空');
        }
        insertOrUpdate.run(item.categoryId, item.groupId, item.maxParticipants || 0);
      }
    });

    transaction(limits);
    res.json({ code: 200, message: '限报数量设置成功' });
  } catch (err) {
    console.error('设置限报数量失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取项目分组限报数量
router.get('/limits', verifyToken, (req, res) => {
  try {
    const { categoryId } = req.query;

    if (!categoryId) {
      return res.status(400).json({ code: 400, message: '项目ID不能为空' });
    }

    const limits = db.prepare(`
      SELECT cgl.*, g.name as groupName, g.categoryType as groupCategoryType
      FROM category_group_limits cgl
      JOIN groups g ON cgl.groupId = g.id
      WHERE cgl.categoryId = ?
    `).all(categoryId);

    res.json({ code: 200, data: limits });
  } catch (err) {
    console.error('获取限报数量失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
