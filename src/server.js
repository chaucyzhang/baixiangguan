const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`订单系统后台启动成功！运行在 http://localhost:${PORT}`);
});
