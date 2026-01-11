const express = require('express');
const cors = require('cors');
const ordersRouter = require('./routers/orders');

const app = express();

app.use(cors());
app.use(express.json());

// 路由
app.use('/api/orders', ordersRouter);

// 404 处理
app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' });
});

module.exports = app;