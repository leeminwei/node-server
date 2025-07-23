const WebSocket = require("ws");
const net = require("net");

const WS_PORT = 8888;         // 接收來自 HTML 的 WebSocket
const C_SERVER_PORT = 9999;   // 傳送給 C socket server
const C_SERVER_IP = "127.0.0.1"; // 或改成你的 C server 的 IP

const wss = new WebSocket.Server({ port: WS_PORT }, () => {
    console.log(`✅ WebSocket server listening on ws://127.0.0.1:${WS_PORT}`);
});

wss.on("connection", (ws) => {
    console.log("🌐 Browser connected via WebSocket");

    ws.on("message", (msg) => {
        console.log("📦 Received JSON from browser:", msg.toString());

        // 將資料轉發給 C socket server
        const client = new net.Socket();
        client.connect(C_SERVER_PORT, C_SERVER_IP, () => {
            client.write(msg.toString());
            client.end();
            console.log("➡️ Forwarded data to C server");
        });

        client.on("error", (err) => {
            console.error("❌ Error sending to C server:", err.message);
        });
    });
});
