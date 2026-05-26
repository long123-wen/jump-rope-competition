const express = require('express');
const path = require('path');
const cors = require('cors');
const { db, initDatabase } = require('./database');

// 导入路由
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const categoryRoutes = require('./routes/categories');
const groupRoutes = require('./routes/groups');
const athleteRoutes = require('./routes/athletes');
const registrationRoutes = require('./routes/registrations');
const orderRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
const adminDistPath = path.join(__dirname, '..', 'admin-frontend', 'dist');
const registrationDistPath = path.join(__dirname, '..', 'registration-frontend', 'dist');
app.use('/admin', express.static(adminDistPath));
app.use('/', express.static(registrationDistPath));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/athletes', athleteRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/orders', orderRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: '服务运行正常', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(adminDistPath, 'index.html'), (err) => {
    if (err) res.status(404).send('管理后台页面未找到');
  });
});
app.get('*', (req, res) => {
  res.sendFile(path.join(registrationDistPath, 'index.html'), (err) => {
    if (err) res.status(404).send('页面未找到');
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

// 初始化数据库
initDatabase();

// 本地启动
if (process.env.APP_MODE !== 'cloud') {
  app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`跳绳赛事报名系统后端服务已启动`);
    console.log(`服务地址: http://localhost:${PORT}`);
    console.log(`管理后台: http://localhost:${PORT}/admin`);
    console.log(`报名系统: http://localhost:${PORT}`);
    console.log(`=================================`);
  });
}

module.exports = app;
