const express = require('express');
const { db } = require('../database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// 获取运动员列表
router.get('/', verifyToken, (req, res) => {
  try {
    const { userId } = req.query;

    // 普通用户只能查看自己的运动员
    let queryUserId = userId;
    if (req.user.role !== 'admin') {
      queryUserId = req.user.id;
    }

    if (!queryUserId) {
      return res.status(400).json({ code: 400, message: '用户ID不能为空' });
    }

    const athletes = db.prepare(
      'SELECT * FROM athletes WHERE userId = ? ORDER BY createdAt DESC'
    ).all(queryUserId);

    res.json({ code: 200, data: athletes });
  } catch (err) {
    console.error('获取运动员列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 添加运动员
router.post('/', verifyToken, (req, res) => {
  try {
    const { name, gender, birthDate, idCard } = req.body;

    if (!name || !gender) {
      return res.status(400).json({ code: 400, message: '姓名和性别不能为空' });
    }

    if (!['男', '女'].includes(gender)) {
      return res.status(400).json({ code: 400, message: '性别只能是"男"或"女"' });
    }

    const userId = req.user.id;

    const result = db.prepare(
      'INSERT INTO athletes (userId, name, gender, birthDate, idCard) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, name, gender, birthDate || '', idCard || '');

    const athlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(result.lastInsertRowid);
    res.json({ code: 200, message: '运动员添加成功', data: athlete });
  } catch (err) {
    console.error('添加运动员失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 更新运动员
router.put('/:id', verifyToken, (req, res) => {
  try {
    const { id } = req.params;
    const { name, gender, birthDate, idCard } = req.body;

    const athlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(id);
    if (!athlete) {
      return res.status(404).json({ code: 404, message: '运动员不存在' });
    }

    // 普通用户只能更新自己的运动员
    if (req.user.role !== 'admin' && athlete.userId !== req.user.id) {
      return res.status(403).json({ code: 403, message: '无权修改此运动员信息' });
    }

    if (gender && !['男', '女'].includes(gender)) {
      return res.status(400).json({ code: 400, message: '性别只能是"男"或"女"' });
    }

    db.prepare(`
      UPDATE athletes SET
        name = COALESCE(?, name),
        gender = COALESCE(?, gender),
        birthDate = COALESCE(?, birthDate),
        idCard = COALESCE(?, idCard)
      WHERE id = ?
    `).run(name ?? null, gender ?? null, birthDate ?? null, idCard ?? null, id);

    const updatedAthlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(id);
    res.json({ code: 200, message: '运动员更新成功', data: updatedAthlete });
  } catch (err) {
    console.error('更新运动员失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 删除运动员
router.delete('/:id', verifyToken, (req, res) => {
  try {
    const { id } = req.params;

    const athlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(id);
    if (!athlete) {
      return res.status(404).json({ code: 404, message: '运动员不存在' });
    }

    // 普通用户只能删除自己的运动员
    if (req.user.role !== 'admin' && athlete.userId !== req.user.id) {
      return res.status(403).json({ code: 403, message: '无权删除此运动员' });
    }

    db.prepare('DELETE FROM athletes WHERE id = ?').run(id);
    res.json({ code: 200, message: '运动员删除成功' });
  } catch (err) {
    console.error('删除运动员失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 批量添加运动员
router.post('/batch', verifyToken, (req, res) => {
  try {
    const { athletes: athleteList } = req.body;

    if (!athleteList || !Array.isArray(athleteList) || athleteList.length === 0) {
      return res.status(400).json({ code: 400, message: '运动员数据不能为空' });
    }

    const userId = req.user.id;
    const insert = db.prepare(
      'INSERT INTO athletes (userId, name, gender, birthDate, idCard) VALUES (?, ?, ?, ?, ?)'
    );

    const transaction = db.transaction((items) => {
      const results = [];
      for (const item of items) {
        if (!item.name || !item.gender) {
          throw new Error('姓名和性别不能为空');
        }
        if (!['男', '女'].includes(item.gender)) {
          throw new Error('性别只能是"男"或"女"');
        }
        const result = insert.run(
          userId,
          item.name,
          item.gender,
          item.birthDate || '',
          item.idCard || ''
        );
        results.push({ id: result.lastInsertRowid, name: item.name, gender: item.gender });
      }
      return results;
    });

    const results = transaction(athleteList);
    res.json({ code: 200, message: `成功添加${results.length}名运动员`, data: results });
  } catch (err) {
    console.error('批量添加运动员失败:', err);
    res.status(500).json({ code: 500, message: err.message || '服务器错误' });
  }
});

module.exports = router;
