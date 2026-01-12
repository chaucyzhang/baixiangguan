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
        // 先删除旧表（如果存在）→ 适合开发/测试环境
        // 注意：生产环境不要轻易执行 DROP TABLE，会丢失所有数据！
        db.run("DROP TABLE IF EXISTS orders");

        // 创建新表
        db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        product_id      TEXT PRIMARY KEY,              -- 必须，主键
    order_no        TEXT UNIQUE,                   -- 可选 + 唯一
    tracking_number TEXT,                          -- 可选
    status          TEXT NOT NULL DEFAULT 'pending',
    buyer_name      TEXT DEFAULT '',               -- 可选
    buyer_phone     TEXT DEFAULT '',               -- 可选
    address         TEXT DEFAULT '',               -- 可选
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
            if (err) {
                console.error('创建 orders 表失败:', err);
            } else {
                console.log('orders 表创建/确认成功');
            }
        });

        // 可选：创建索引，提升查询效率
        db.run("CREATE INDEX IF NOT EXISTS idx_order_no ON orders(order_no)");
        db.run("CREATE INDEX IF NOT EXISTS idx_tracking_number ON orders(tracking_number)");
    });
}

module.exports = db;