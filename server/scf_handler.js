'use strict';
const app = require('./index');

// 腾讯云 SCF 入口 - 将 API 网关事件转换为 Express 请求
exports.main_handler = async (event, context) => {
  const { httpMethod, path, headers, queryStringParameters, body } = event;
  
  const req = {
    method: httpMethod || 'GET',
    url: path || '/',
    headers: headers || {},
    body: body || '',
    query: queryStringParameters || {},
    params: {},
  };
  
  if (typeof req.body === 'string' && req.body) {
    try { req.body = JSON.parse(req.body); } catch (e) {}
  }
  
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      _body: '',
      setHeader(k, v) { this.headers[k] = v; },
      json(data) {
        this.headers['Content-Type'] = 'application/json';
        resolve({ statusCode: this.statusCode, headers: this.headers, body: JSON.stringify(data), isBase64Encoded: false });
      },
      send(data) {
        resolve({ statusCode: this.statusCode, headers: this.headers, body: String(data), isBase64Encoded: false });
      },
      status(code) { this.statusCode = code; return this; },
      set(k, v) { this.setHeader(k, v); return this; },
      type(t) { this.headers['Content-Type'] = t; return this; },
      redirect(url) { this.statusCode = 302; this.headers['Location'] = url; resolve({ statusCode: 302, headers: this.headers, body: '', isBase64Encoded: false }); },
      sendFile(filePath, callback) {
        const fs = require('fs');
        try {
          const content = fs.readFileSync(filePath);
          this.headers['Content-Type'] = 'text/html; charset=utf-8';
          resolve({ statusCode: this.statusCode, headers: this.headers, body: content.toString('base64'), isBase64Encoded: true });
        } catch (e) {
          this.statusCode = 404;
          resolve({ statusCode: 404, headers: this.headers, body: 'Not Found', isBase64Encoded: false });
        }
      }
    };
    
    app(req, res);
  });
};
