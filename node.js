const http = require("http");
const WebSocket = require("ws");
const net = require("net");

// ==== config ====            
const C_SERVER_PORT = 14091;                   // 傳給 C server
const C_SERVER_IP = "0.tcp.jp.ngrok.io";       // 如果在同一台機器就保持這樣

// ==== 建立 HTTP server（讓 Railway 知道要 expose 這個 port）====
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("WebSocket Relay Server is running.");
});

// ==== 建立 WebSocket Server，掛在上面的 HTTP server 上 ====
const wss = new WebSocket.Server({ server });

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

// ==== 啟動 HTTP + WebSocket Server ====
const PORT = process.env.PORT || 8888;
server.listen(PORT, () => {
  console.log(`✅ WebSocket Relay Server listening on port ${PORT}`);
});
