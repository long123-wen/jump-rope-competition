const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rope-skipping-system-secret-key-2024';

// 验证Token中间件
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: '令牌无效或已过期' });
  }
}

// 验证管理员权限中间件
function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '权限不足，需要管理员权限' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: '令牌无效或已过期' });
  }
}

module.exports = { verifyToken, verifyAdmin, JWT_SECRET };
