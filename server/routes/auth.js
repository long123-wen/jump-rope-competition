const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// 管理员登录
router.post('/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    }

    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }

    const isMatch = bcrypt.compareSync(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, realName: admin.realName, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: admin.id,
          username: admin.username,
          realName: admin.realName,
          role: 'admin'
        }
      }
    });
  } catch (err) {
    console.error('管理员登录失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 用户注册（俱乐部/学校老师）
router.post('/register', (req, res) => {
  try {
    const { username, password, orgType, orgName, realName, phone } = req.body;

    if (!username || !password || !orgType || !orgName || !realName || !phone) {
      return res.status(400).json({ code: 400, message: '所有字段都不能为空' });
    }

    if (!['俱乐部', '学校'].includes(orgType)) {
      return res.status(400).json({ code: 400, message: '机构类型只能是"俱乐部"或"学校"' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ code: 400, message: '用户名已存在' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (username, password, orgType, orgName, realName, phone) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(username, hashedPassword, orgType, orgName, realName, phone);

    const token = jwt.sign(
      { id: result.lastInsertRowid, username, orgType, orgName, realName, role: 'user' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      code: 200,
      message: '注册成功',
      data: {
        token,
        user: {
          id: result.lastInsertRowid,
          username,
          orgType,
          orgName,
          realName,
          role: 'user'
        }
      }
    });
  } catch (err) {
    console.error('用户注册失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 用户登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        orgType: user.orgType,
        orgName: user.orgName,
        realName: user.realName,
        role: 'user'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          orgType: user.orgType,
          orgName: user.orgName,
          realName: user.realName,
          phone: user.phone,
          role: 'user'
        }
      }
    });
  } catch (err) {
    console.error('用户登录失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取当前用户信息
router.get('/profile', verifyToken, (req, res) => {
  try {
    const { id, role } = req.user;

    if (role === 'admin') {
      const admin = db.prepare('SELECT id, username, realName FROM admins WHERE id = ?').get(id);
      if (!admin) {
        return res.status(404).json({ code: 404, message: '用户不存在' });
      }
      return res.json({
        code: 200,
        data: { ...admin, role: 'admin' }
      });
    }

    const user = db.prepare(
      'SELECT id, username, orgType, orgName, realName, phone, createdAt FROM users WHERE id = ?'
    ).get(id);
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    res.json({
      code: 200,
      data: { ...user, role: 'user' }
    });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
