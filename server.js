const http = require("http");
const WebSocket = require("ws");
const net = require("net");

// ==== 讀取 ngrok 參數（Render 上的環境變數）====
const C_SERVER_IP = process.env.NGROK_HOST || "127.0.0.1";
const C_SERVER_PORT = parseInt(process.env.NGROK_PORT) || 9999;

// ==== 建立 HTTP server（讓 Render 能 Expose）====
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

    // 將資料轉發給本機的 C socket server（經 ngrok）
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

// ==== 啟動 HTTP + WebSocket Server ====
const PORT = process.env.PORT || 8888;
server.listen(PORT, () => {
  console.log(`✅ WebSocket Relay Server listening on port ${PORT}`);
});
