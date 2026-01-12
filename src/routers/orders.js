const express = require('express');
const db = require('../db/database');
const router = express.Router();

// 获取所有订单（可加分页、筛选）
// 获取所有订单（支持分页/筛选，可选）
router.get('/', (req, res) => {
    const { status, page = 1, limit = 300 } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM orders';
    let params = [];

    if (status) {
        sql += ' WHERE status = ?';
        params.push(status);
    }

    sql += ' ORDER BY product_id ASC LIMIT ? OFFSET ?';  // 按 product_id 升序
    params.push(Number(limit), offset);

    // 同步查询（better-sqlite3）
    try {
        const rows = db.prepare(sql).all(...params);
        res.json(rows);
    } catch (err) {
        console.error('查询失败:', err);
        res.status(500).json({ error: '查询失败' });
    }
});

// 获取单个订单（按 product_id）
router.get('/:productId', (req, res) => {
    const { productId } = req.params;

    try {
        const row = db.prepare('SELECT * FROM orders WHERE product_id = ?').get(productId);
        if (!row) {
            return res.status(404).json({ error: '订单不存在' });
        }
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: '查询失败' });
    }
});

// 创建订单
router.post('/', (req, res) => {
    let items = req.body;

    // 兼容单条：自动转数组
    if (!Array.isArray(items)) {
        items = [items];
    }

    if (items.length === 0) {
        return res.status(400).json({ error: '没有提供数据' });
    }

    const stmt = db.prepare(`
    INSERT INTO orders (product_id, status, order_no, tracking_number, buyer_name, buyer_phone, address)
    VALUES (@product_id, @status, @order_no, @tracking_number, @buyer_name, @buyer_phone, @address)
  `);

    try {
        db.transaction(() => {
            items.forEach(item => {
                if (!item.product_id) throw new Error('缺少 product_id');
                stmt.run({
                    product_id: item.product_id,
                    status: item.status || 'pending',
                    order_no: item.order_no || null,
                    tracking_number: item.tracking_number || null,
                    buyer_name: item.buyer_name || '',
                    buyer_phone: item.buyer_phone || '',
                    address: item.address || ''
                });
            });
        })();

        res.status(201).json({
            message: `成功插入 ${items.length} 条订单`,
            count: items.length
        });
    } catch (err) {
        console.error('插入失败:', err);
        res.status(400).json({ error: err.message || '插入失败（可能 product_id 已存在）' });
    }
});
// 更新订单状态（最常用接口）
router.patch('/', (req, res) => {
    let items = req.body;

    // 如果不是数组，自动包装成数组（兼容单条）
    if (!Array.isArray(items)) {
        if (!items || !items.product_id) {
            return res.status(400).json({ error: '缺少 product_id' });
        }
        items = [items];
    }

    // 批量校验 product_id 必须存在
    for (const item of items) {
        if (!item.product_id) {
            return res.status(400).json({ error: '每条更新数据必须包含 product_id' });
        }
    }

    // 允许更新的字段
    const allowedFields = [
        'order_no', 'tracking_number', 'status', 'buyer_name', 'buyer_phone', 'address'
    ];

    let successCount = 0;
    let failList = [];

    try {
        db.transaction(() => {
            for (const updateData of items) {
                const { product_id, ...updates } = updateData;

                // 过滤允许字段
                const fieldsToUpdate = Object.keys(updates)
                    .filter(key => allowedFields.includes(key) && updates[key] !== undefined);

                if (fieldsToUpdate.length === 0) {
                    failList.push({ product_id, reason: '没有可更新字段' });
                    continue;
                }

                const setClause = fieldsToUpdate.map(key => `${key} = ?`).join(', ');
                const values = fieldsToUpdate.map(key => updates[key]);
                values.push(product_id);

                const sql = `UPDATE orders SET ${setClause} WHERE product_id = ?`;

                const info = db.prepare(sql).run(...values);

                if (info.changes === 0) {
                    failList.push({ product_id, reason: '订单不存在' });
                } else {
                    successCount++;
                }
            }
        })();

        res.json({
            message: `更新完成：成功 ${successCount} 条，失败 ${failList.length} 条`,
            successCount,
            failCount: failList.length,
            failures: failList
        });
    } catch (err) {
        console.error('批量更新失败:', err);
        res.status(500).json({ error: '批量更新失败' });
    }
});
router.delete('/:productId', (req, res) => {
    const { productId } = req.params;

    try {
        const info = db.prepare('DELETE FROM orders WHERE product_id = ?').run(productId);
        if (info.changes === 0) {
            return res.status(404).json({ error: '订单不存在' });
        }
        res.json({
            message: '删除成功',
            product_id: productId
        });
    } catch (err) {
        console.error('删除失败:', err);
        res.status(500).json({ error: '删除失败' });
    }
});

module.exports = router;