const express = require('express');
const db = require('../db/database');
const router = express.Router();

// 获取所有订单（可加分页、筛选）
router.get('/', (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
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
    const { order_no, product_id, status = 'pending', address } = req.body;

    if (!order_no || !product_id || !address) {
        return res.status(400).json({ error: '缺少必要字段' });
    }

    const sql = `
    INSERT INTO orders (order_no, product_id, status, address)
    VALUES (?, ?, ?, ?)
  `;

    db.run(sql, [order_no, product_id, status, address], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint')) {
                return res.status(409).json({ error: '订单号已存在' });
            }
            return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
            id: this.lastID,
            order_no,
            message: '订单创建成功'
        });
    });
});

// 更新订单状态（最常用接口）
router.patch('/:orderNo/status', (req, res) => {
    const { orderNo } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: '无效的状态值' });
    }

    db.run(
        'UPDATE orders SET status = ? WHERE order_no = ?',
        [status, orderNo],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: '订单不存在' });

            res.json({ message: '状态更新成功', order_no: orderNo, new_status: status });
        }
    );
});

module.exports = router;