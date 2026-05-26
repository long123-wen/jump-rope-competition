const express = require('express');
const { db } = require('../database');
const { verifyAdmin, verifyToken } = require('../middleware/auth');

const router = express.Router();

// 获取赛事列表（管理员）
router.get('/', verifyAdmin, (req, res) => {
  try {
    const events = db.prepare('SELECT * FROM events ORDER BY createdAt DESC').all();
    res.json({ code: 200, data: events });
  } catch (err) {
    console.error('获取赛事列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 公开赛事列表（报名用）
router.get('/public', (req, res) => {
  try {
    const events = db.prepare(
      "SELECT id, name, description, startDate, endDate, location, status FROM events WHERE status IN ('报名中', '进行中') ORDER BY createdAt DESC"
    ).all();
    res.json({ code: 200, data: events });
  } catch (err) {
    console.error('获取公开赛事列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 创建赛事（管理员）
router.post('/', verifyAdmin, (req, res) => {
  try {
    const { name, description, startDate, endDate, location, status } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ code: 400, message: '赛事名称、开始日期和结束日期不能为空' });
    }

    const validStatuses = ['报名中', '已截止', '进行中', '已结束'];
    const eventStatus = status || '报名中';
    if (!validStatuses.includes(eventStatus)) {
      return res.status(400).json({ code: 400, message: '无效的赛事状态' });
    }

    const result = db.prepare(
      'INSERT INTO events (name, description, startDate, endDate, location, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, description || '', startDate, endDate, location || '', eventStatus);

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
    res.json({ code: 200, message: '赛事创建成功', data: event });
  } catch (err) {
    console.error('创建赛事失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 更新赛事（管理员）
router.put('/:id', verifyAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, startDate, endDate, location, status } = req.body;

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!event) {
      return res.status(404).json({ code: 404, message: '赛事不存在' });
    }

    const validStatuses = ['报名中', '已截止', '进行中', '已结束'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ code: 400, message: '无效的赛事状态' });
    }

    db.prepare(`
      UPDATE events SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        startDate = COALESCE(?, startDate),
        endDate = COALESCE(?, endDate),
        location = COALESCE(?, location),
        status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      name ?? null,
      description ?? null,
      startDate ?? null,
      endDate ?? null,
      location ?? null,
      status ?? null,
      id
    );

    const updatedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.json({ code: 200, message: '赛事更新成功', data: updatedEvent });
  } catch (err) {
    console.error('更新赛事失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 删除赛事（管理员）
router.delete('/:id', verifyAdmin, (req, res) => {
  try {
    const { id } = req.params;

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!event) {
      return res.status(404).json({ code: 404, message: '赛事不存在' });
    }

    db.prepare('DELETE FROM events WHERE id = ?').run(id);
    res.json({ code: 200, message: '赛事删除成功' });
  } catch (err) {
    console.error('删除赛事失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
