const WebSocket = require('ws');
const net = require('net');
const express = require('express');
const http = require('http');

// 創建 Express 應用
const app = express();
const server = http.createServer(app);

// 添加 CORS 中間件
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// 基本路由
app.get('/', (req, res) => {
    res.json({ 
        status: 'WebSocket 中繼服務器運行中',
        timestamp: new Date().toISOString(),
        websocket: 'wss://node-server-production-09d7.up.railway.app'
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// WebSocket 服務器
const wss = new WebSocket.Server({ 
    server,
    verifyClient: (info) => {
        const origin = info.origin;
        console.log('WebSocket 連接來源:', origin);
        // 允許來自 GitHub Pages 和本地開發的連接
        return true;
    }
});

// C語言服務器的配置
// ==== config ====
const C_SERVER_PORT = 14091;                   // 傳給 C server
const C_SERVER_HOST = "0.tcp.jp.ngrok.io";       // ngrok TCP 轉發的主機名稱

console.log(`C服務器配置: ${C_SERVER_HOST}:${C_SERVER_PORT}`);

wss.on('connection', function connection(ws, req) {
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`前端連線成功，來源: ${req.headers.origin}, IP: ${clientIP}`);
    
    // 發送連接確認
    ws.send(JSON.stringify({
        type: 'connection',
        status: 'success',
        message: '已連接到餐廳訂單系統'
    }));
    
    ws.on('message', function incoming(data) {
        try {
            console.log('收到原始數據:', data.toString());
            const orderData = JSON.parse(data);
            console.log('解析後的訂單數據:', orderData);
            
            // 驗證訂單數據
            if (!orderData.name || !orderData.meals || !orderData.total) {
                ws.send(JSON.stringify({
                    type: 'error',
                    status: 'error',
                    message: '訂單數據不完整'
                }));
                return;
            }
            
            // 將訂單數據轉換為C程序期望的格式
            const messageForC = formatOrderForC(orderData);
            console.log('發送給C服務器的數據:', messageForC);
            
            // 建立與C服務器的TCP連線
            const client = new net.Socket();
            
            // 設置超時
            client.setTimeout(10000); // 10秒超時
            
            client.connect(C_SERVER_PORT, C_SERVER_HOST, function() {
                console.log('連接到C服務器成功');
                client.write(messageForC);
                
                // 向前端發送確認消息
                ws.send(JSON.stringify({
                    type: 'success',
                    status: 'success',
                    message: `${orderData.name} 的訂單已成功發送到餐廳系統！`,
                    orderInfo: {
                        name: orderData.name,
                        total: orderData.total,
                        itemCount: orderData.meals.length
                    }
                }));
            });
            
            client.on('data', function(data) {
                console.log('從C服務器收到回應:', data.toString());
                client.destroy();
            });
            
            client.on('error', function(err) {
                console.error('C服務器連線錯誤:', err.message);
                ws.send(JSON.stringify({
                    type: 'error',
                    status: 'error',
                    message: '無法連接到餐廳系統，請檢查網絡連接或稍後再試'
                }));
            });
            
            client.on('timeout', function() {
                console.log('C服務器連線超時');
                client.destroy();
                ws.send(JSON.stringify({
                    type: 'timeout',
                    status: 'error',
                    message: '餐廳系統響應超時，請稍後再試'
                }));
            });
            
            client.on('close', function() {
                console.log('與C服務器的連線已關閉');
            });
            
        } catch (error) {
            console.error('處理訊息時發生錯誤:', error);
            ws.send(JSON.stringify({
                type: 'parse_error',
                status: 'error',
                message: '訂單數據格式錯誤'
            }));
        }
    });
    
    ws.on('close', function() {
        console.log('前端連線已關閉');
    });
    
    ws.on('error', function(error) {
        console.error('WebSocket 錯誤:', error);
    });
});

// 將訂單數據格式化為C程序期望的格式
function formatOrderForC(orderData) {
    const orderInfo = {
        name: orderData.name,
        meals: Array.isArray(orderData.meals) ? orderData.meals.join(',') : orderData.meals.toString(),
        total: orderData.total
    };
    
    return JSON.stringify(orderInfo);
}

// 優雅關閉
process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信號，正在關閉服務器...');
    server.close(() => {
        console.log('服務器已關閉');
        process.exit(0);
    });
});

// 監聽端口
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`服務器運行在端口 ${PORT}`);
    console.log('WebSocket 端點: wss://node-server-production-09d7.up.railway.app');
    console.log('HTTP 健康檢查: https://node-server-production-09d7.up.railway.app/health');
});