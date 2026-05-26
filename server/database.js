const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Vercel serverless 使用 /tmp 目录，本地使用 data 目录
const isVercel = process.env.VERCEL === '1';
const dataDir = isVercel ? '/tmp' : path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'rope-skipping.db');

const db = new Database(dbPath);

// 启用WAL模式和外键约束
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 初始化数据库表
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      realName TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      orgType TEXT NOT NULL,
      orgName TEXT NOT NULL,
      realName TEXT NOT NULL,
      phone TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      location TEXT,
      status TEXT NOT NULL DEFAULT '报名中',
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventId INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      fee REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventId INTEGER NOT NULL,
      categoryType TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS category_group_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoryId INTEGER NOT NULL,
      groupId INTEGER NOT NULL,
      maxParticipants INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE,
      UNIQUE(categoryId, groupId)
    );

    CREATE TABLE IF NOT EXISTS athletes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      gender TEXT NOT NULL,
      birthDate TEXT,
      idCard TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      eventId INTEGER NOT NULL,
      categoryId INTEGER NOT NULL,
      groupId INTEGER NOT NULL,
      athleteId INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT '待确认',
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (athleteId) REFERENCES athletes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sequence INTEGER NOT NULL,
      categoryId INTEGER NOT NULL,
      groupId INTEGER NOT NULL,
      athleteId INTEGER NOT NULL,
      registrationId INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (athleteId) REFERENCES athletes(id) ON DELETE CASCADE,
      FOREIGN KEY (registrationId) REFERENCES registrations(id) ON DELETE CASCADE
    );
  `);

  // 初始化默认管理员账号
  const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admins (username, password, realName) VALUES (?, ?, ?)').run(
      'admin',
      hashedPassword,
      '系统管理员'
    );
    console.log('默认管理员账号已创建: admin / admin123');
  }
}

module.exports = { db, initDatabase };
