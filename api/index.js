const http = require('http');
const fs = require('fs');
const path = require('path');

// 内存数据存储
const events = [];
const categories = [];
const groups = [];
const athletes = [];
const registrations = [];

const server = http.createServer((req, res) => {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = req.url;
  const method = req.method;

  // API 路由
  if (url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 200, message: '服务运行正常', timestamp: new Date().toISOString() }));
    return;
  }

  if (url === '/api/events' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 200, data: events }));
    return;
  }

  if (url === '/api/events/public' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 200, data: events.filter(e => e.status === '报名中') }));
    return;
  }

  if (url === '/api/auth/admin/login' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 200, message: '登录成功', data: { token: 'demo-token', user: { id: 1, username: 'admin', realName: '系统管理员', role: 'admin' } } }));
    return;
  }

  if (url === '/api/auth/login' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 200, message: '登录成功', data: { token: 'demo-token', user: { id: 1, username: 'test', realName: '测试用户' } } }));
    return;
  }

  if (url === '/api/categories' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 200, data: categories }));
    return;
  }

  if (url === '/api/groups' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 200, data: groups }));
    return;
  }

  if (url === '/api/athletes' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 200, data: athletes }));
    return;
  }

  if (url === '/api/registrations' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 200, data: registrations }));
    return;
  }

  if (url === '/api/orders' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 200, data: [] }));
    return;
  }

  // 静态文件服务
  let filePath = '';
  if (url.startsWith('/admin/')) {
    filePath = path.join(__dirname, '..', 'public', url);
  } else if (url === '/admin') {
    filePath = path.join(__dirname, '..', 'public', 'admin', 'index.html');
  } else if (url.startsWith('/assets/')) {
    filePath = path.join(__dirname, '..', 'public', url);
  } else if (url === '/' || !url.includes('.')) {
    filePath = path.join(__dirname, '..', 'public', 'index.html');
  } else {
    filePath = path.join(__dirname, '..', 'public', url);
  }

  // 读取文件
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // 如果是 SPA 路由，返回 index.html
      if (!url.startsWith('/api/')) {
        const indexPath = url.startsWith('/admin') 
          ? path.join(__dirname, '..', 'public', 'admin', 'index.html')
          : path.join(__dirname, '..', 'public', 'index.html');
        
        fs.readFile(indexPath, (err2, data2) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data2);
          }
        });
        return;
      }
      
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 404, message: '接口不存在' }));
      return;
    }

    // 根据文件扩展名设置 Content-Type
    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    }[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
