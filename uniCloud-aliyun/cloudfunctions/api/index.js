const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 内存数据库
const events = [];
const categories = [];
const groups = [];
const athletes = [];
const registrations = [];

// 路由
app.post('/api/auth/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    res.json({ code: 200, message: '登录成功', data: { token: 'demo-token', user: { id: 1, username: 'admin', realName: '系统管理员', role: 'admin' } } });
  } else {
    res.status(401).json({ code: 401, message: '用户名或密码错误' });
  }
});

app.get('/api/events', (req, res) => res.json({ code: 200, data: events }));
app.post('/api/events', (req, res) => { events.push({ id: Date.now(), ...req.body }); res.json({ code: 200 }); });
app.get('/api/categories', (req, res) => res.json({ code: 200, data: categories }));
app.get('/api/groups', (req, res) => res.json({ code: 200, data: groups }));
app.get('/api/athletes', (req, res) => res.json({ code: 200, data: athletes }));
app.get('/api/registrations', (req, res) => res.json({ code: 200, data: registrations }));
app.get('/api/orders', (req, res) => res.json({ code: 200, data: [] }));
app.get('/api/health', (req, res) => res.json({ code: 200, message: '服务正常' }));

// uniCloud 云函数入口
exports.main = async (event, context) => {
  const { path, httpMethod, headers, queryStringParameters, body } = event;
  
  return new Promise((resolve) => {
    const req = {
      method: httpMethod,
      url: path,
      headers,
      query: queryStringParameters,
      body: body ? JSON.parse(body) : {}
    };
    
    const res = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      json(data) { resolve({ statusCode: 200, headers: this.headers, body: JSON.stringify(data) }); },
      status(code) { this.statusCode = code; return this; },
      send(data) { resolve({ statusCode: this.statusCode, headers: this.headers, body: JSON.stringify(data) }); }
    };
    
    app(req, res);
  });
};
