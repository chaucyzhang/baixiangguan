const express = require('express');
const db = require('../db/database');
const router = express.Router();

// 获取所有订单（可加分页、筛选）
router.get('/', (req, res) => {
    const { status, page = 1, limit = 300 } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM orders';
    let params = [];

    if (status) {
        sql += ' WHERE status = ?';
        params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 获取单个订单
router.get('/:orderNo', (req, res) => {
    const { orderNo } = req.params;

    db.get('SELECT * FROM orders WHERE order_no = ?', [orderNo], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: '订单不存在' });
        res.json(row);
    });
});

// 创建订单
router.post('/', (req, res) => {
    const data = req.body;

    // 如果是数组 → 批量插入
    if (Array.isArray(data)) {
        const stmt = db.prepare(`
      INSERT INTO orders (product_id, status, order_no, tracking_number, buyer_name, buyer_phone, address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        try {
            db.transaction(() => {
                data.forEach(item => {
                    stmt.run(
                        item.product_id,
                        item.status || 'pending',
                        item.order_no || null,
                        item.tracking_number || null,
                        item.buyer_name || '',
                        item.buyer_phone || '',
                        item.address || ''
                    );
                });
            })();

            res.status(201).json({
                message: `成功批量插入 ${data.length} 条订单`,
                count: data.length
            });
        } catch (err) {
            console.error('批量插入失败:', err);
            res.status(500).json({ error: '批量插入失败' });
        } finally {
            stmt.finalize();
        }
    }
    // 单条插入（原有逻辑）
    else {
        const {
            product_id, order_no, status = 'pending', tracking_number,
            buyer_name = '', buyer_phone = '', address = ''
        } = data;

        if (!product_id) {
            return res.status(400).json({ error: 'product_id 是必填字段' });
        }

        const sql = `
      INSERT INTO orders (product_id, order_no, status, tracking_number, buyer_name, buyer_phone, address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

        db.run(sql, [product_id, order_no || null, status, tracking_number || null, buyer_name, buyer_phone, address], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint')) {
                    return res.status(409).json({ error: 'product_id 已存在' });
                }
                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({
                product_id,
                message: '订单创建成功'
            });
        });
    }
});
// 更新订单状态（最常用接口）
router.patch('/:productId', (req, res) => {   // 注意：这里用 product_id 作为路径参数
    const { productId } = req.params;
    const updates = req.body;

    // 允许更新的字段（不包括 product_id，因为它是主键）
    const allowedFields = [
        'order_no',
        'tracking_number',
        'status',
        'buyer_name',
        'buyer_phone',
        'address'
    ];

    const fieldsToUpdate = Object.keys(updates)
        .filter(key => allowedFields.includes(key));

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ error: '没有提供任何可更新字段' });
    }

    // 构建动态 SQL
    const setClause = fieldsToUpdate.map(key => `${key} = ?`).join(', ');
    const values = fieldsToUpdate.map(key => updates[key]);
    values.push(productId);

    const sql = `
    UPDATE orders
    SET ${setClause}
    WHERE product_id = ?
  `;

    db.run(sql, values, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint') && err.message.includes('order_no')) {
                return res.status(409).json({ error: 'order_no 已存在，无法使用' });
            }
            return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: '订单不存在' });
        }

        res.json({
            message: '订单信息更新成功',
            product_id: productId,
            updated_fields: fieldsToUpdate
        });
    });
});

router.delete('/:productId', (req, res) => {
    const { productId } = req.params;

    if (!productId) {
        return res.status(400).json({ error: 'product_id 是必填参数' });
    }

    const sql = 'DELETE FROM orders WHERE product_id = ?';

    db.run(sql, [productId], function(err) {
        if (err) {
            console.error('删除订单失败:', err);
            return res.status(500).json({ error: '删除失败' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: '未找到该商品ID的订单' });
        }

        res.json({
            message: '订单删除成功',
            product_id: productId,
            deleted: true
        });
    });
});

module.exports = router;