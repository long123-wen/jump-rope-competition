// 简化版 Vercel Serverless Function
module.exports = (req, res) => {
  const { url, method } = req;
  
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 路由处理
  if (url === '/api/health') {
    return res.json({ code: 200, message: '服务运行正常', timestamp: new Date().toISOString() });
  }
  
  if (url === '/api/events' && method === 'GET') {
    return res.json({ code: 200, data: [] });
  }
  
  if (url === '/api/events/public' && method === 'GET') {
    return res.json({ code: 200, data: [] });
  }
  
  if (url === '/api/auth/admin/login' && method === 'POST') {
    return res.json({ code: 200, message: '登录成功', data: { token: 'demo-token', user: { id: 1, username: 'admin', realName: '系统管理员', role: 'admin' } } });
  }
  
  if (url === '/api/auth/login' && method === 'POST') {
    return res.json({ code: 200, message: '登录成功', data: { token: 'demo-token', user: { id: 1, username: 'test', realName: '测试用户' } } });
  }
  
  if (url === '/api/categories' && method === 'GET') {
    return res.json({ code: 200, data: [] });
  }
  
  if (url === '/api/groups' && method === 'GET') {
    return res.json({ code: 200, data: [] });
  }
  
  if (url === '/api/athletes' && method === 'GET') {
    return res.json({ code: 200, data: [] });
  }
  
  if (url === '/api/registrations' && method === 'GET') {
    return res.json({ code: 200, data: [] });
  }
  
  if (url === '/api/orders' && method === 'GET') {
    return res.json({ code: 200, data: [] });
  }
  
  // 默认响应
  res.status(404).json({ code: 404, message: '接口不存在' });
};
