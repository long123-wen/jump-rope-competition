const express = require('express');
const { db } = require('../database');
const { verifyAdmin, verifyToken } = require('../middleware/auth');

const router = express.Router();

// 获取项目列表
router.get('/', verifyToken, (req, res) => {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({ code: 400, message: '赛事ID不能为空' });
    }

    const categories = db.prepare(
      'SELECT * FROM categories WHERE eventId = ? ORDER BY createdAt DESC'
    ).all(eventId);

    // 获取每个项目的分组限报信息
    for (const cat of categories) {
      const limits = db.prepare(`
        SELECT cgl.*, g.name as groupName, g.categoryType as groupCategoryType
        FROM category_group_limits cgl
        JOIN groups g ON cgl.groupId = g.id
        WHERE cgl.categoryId = ?
      `).all(cat.id);
      cat.groupLimits = limits;
    }

    res.json({ code: 200, data: categories });
  } catch (err) {
    console.error('获取项目列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 创建项目（管理员）
router.post('/', verifyAdmin, (req, res) => {
  try {
    const { eventId, name, description, type, fee } = req.body;

    if (!eventId || !name || !type) {
      return res.status(400).json({ code: 400, message: '赛事ID、项目名称和项目类型不能为空' });
    }

    const validTypes = ['速度赛', '花样赛', '耐力赛', '团体赛', '接力赛'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ code: 400, message: '无效的项目类型' });
    }

    const event = db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ code: 404, message: '赛事不存在' });
    }

    const result = db.prepare(
      'INSERT INTO categories (eventId, name, description, type, fee) VALUES (?, ?, ?, ?, ?)'
    ).run(eventId, name, description || '', type, fee || 0);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.json({ code: 200, message: '项目创建成功', data: category });
  } catch (err) {
    console.error('创建项目失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 更新项目（管理员）
router.put('/:id', verifyAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, fee } = req.body;

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!category) {
      return res.status(404).json({ code: 404, message: '项目不存在' });
    }

    if (type) {
      const validTypes = ['速度赛', '花样赛', '耐力赛', '团体赛', '接力赛'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ code: 400, message: '无效的项目类型' });
      }
    }

    db.prepare(`
      UPDATE categories SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        type = COALESCE(?, type),
        fee = COALESCE(?, fee)
      WHERE id = ?
    `).run(name ?? null, description ?? null, type ?? null, fee ?? null, id);

    const updatedCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json({ code: 200, message: '项目更新成功', data: updatedCategory });
  } catch (err) {
    console.error('更新项目失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 删除项目（管理员）
router.delete('/:id', verifyAdmin, (req, res) => {
  try {
    const { id } = req.params;

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!category) {
      return res.status(404).json({ code: 404, message: '项目不存在' });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ code: 200, message: '项目删除成功' });
  } catch (err) {
    console.error('删除项目失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
