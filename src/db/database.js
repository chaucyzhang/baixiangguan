const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('数据库连接失败:', err);
    } else {
        console.log('已连接 SQLite 数据库');
        initDatabase();
    }
});

function initDatabase() {
    db.serialize(() => {
        db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        order_no    TEXT NOT NULL UNIQUE,
        product_id  TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'pending',
        address     TEXT NOT NULL,
        created_at  TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

        db.run(`CREATE INDEX IF NOT EXISTS idx_order_no ON orders(order_no)`);
    });
}

module.exports = db;