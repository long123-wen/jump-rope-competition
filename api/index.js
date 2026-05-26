const express = require('express');
const cors = require('cors');

// Vercel serverless 版本 - 使用内存数据库
const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 内存数据库
const admins = [{ id: 1, username: 'admin', password: '$2a$10$YourHashedPasswordHere', realName: '系统管理员' }];
const events = [];
const categories = [];
const groups = [];
const athletes = [];
const registrations = [];

// 登录接口
app.post('/api/auth/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    res.json({ code: 200, message: '登录成功', data: { token: 'demo-token', user: { id: 1, username: 'admin', realName: '系统管理员', role: 'admin' } } });
  } else {
    res.status(401).json({ code: 401, message: '用户名或密码错误' });
  }
});

app.post('/api/auth/login', (req, res) => {
  res.json({ code: 200, message: '登录成功', data: { token: 'demo-token', user: { id: 1, username: 'test', realName: '测试用户' } } });
});

app.post('/api/auth/register', (req, res) => {
  res.json({ code: 200, message: '注册成功' });
});

// 赛事接口
app.get('/api/events', (req, res) => {
  res.json({ code: 200, data: events });
});

app.get('/api/events/public', (req, res) => {
  res.json({ code: 200, data: events.filter(e => e.status === '报名中') });
});

app.post('/api/events', (req, res) => {
  const event = { id: Date.now(), ...req.body, createdAt: new Date().toISOString() };
  events.push(event);
  res.json({ code: 200, data: event });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: '服务运行正常', timestamp: new Date().toISOString() });
});

// 其他 API 路由
app.get('/api/categories', (req, res) => res.json({ code: 200, data: categories }));
app.post('/api/categories', (req, res) => { categories.push({ id: Date.now(), ...req.body }); res.json({ code: 200 }); });

app.get('/api/groups', (req, res) => res.json({ code: 200, data: groups }));
app.post('/api/groups', (req, res) => { groups.push({ id: Date.now(), ...req.body }); res.json({ code: 200 }); });

app.get('/api/athletes', (req, res) => res.json({ code: 200, data: athletes }));
app.post('/api/athletes', (req, res) => { athletes.push({ id: Date.now(), ...req.body }); res.json({ code: 200 }); });

app.get('/api/registrations', (req, res) => res.json({ code: 200, data: registrations }));
app.post('/api/registrations', (req, res) => { registrations.push({ id: Date.now(), ...req.body }); res.json({ code: 200 }); });

app.get('/api/orders', (req, res) => res.json({ code: 200, data: [] }));

// Vercel serverless handler
module.exports = (req, res) => {
  return app(req, res);
};
