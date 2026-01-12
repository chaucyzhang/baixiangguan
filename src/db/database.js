const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

// 初始化表（同步方式）
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    product_id      TEXT PRIMARY KEY,
    order_no        TEXT UNIQUE,
    tracking_number TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',
    buyer_name      TEXT DEFAULT '',
    buyer_phone     TEXT DEFAULT '',
    address         TEXT DEFAULT '',
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;