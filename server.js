const http = require("http");
const WebSocket = require("ws");
const net = require("net");

// ngrok TCP 轉接資訊
const C_SERVER_IP = process.env.C_SERVER_IP || "0.tcp.jp.ngrok.io";
const C_SERVER_PORT = parseInt(process.env.C_SERVER_PORT) || 14091;

// 建立 HTTP server（給 Render 用來升級成 WebSocket）
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("WebSocket Relay Server is running.");
});

// 建立 WebSocket server，掛在 HTTP server 上
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("🌐 Browser connected via WebSocket");

  ws.on("message", (msg) => {
    console.log("📦 Received JSON from browser:", msg.toString());

    const client = new net.Socket();
    client.connect(C_SERVER_PORT, C_SERVER_IP, () => {
      client.write(msg.toString());
      client.end();
      console.log("➡️ Forwarded data to C server via ngrok");
    });

    client.on("error", (err) => {
      console.error("❌ Error sending to C server:", err.message);
    });
  });
});

// 使用 Render 給的 PORT 啟動 server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ WebSocket Relay Server listening on port ${PORT}`);
});
