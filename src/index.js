import "dotenv/config";
import http from "http";
import { allowedOrigins, app } from "./app.js";
import connectMongo from "./db/index.js";
import { initSocketIO } from "./sockets/chat.socket.js";

const isServerless = Boolean(process.env.VERCEL);

// In serverless mode we log startup/runtime failures instead of terminating
// the process, so Vercel can return a normal HTTP response.
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  if (!isServerless) process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  if (!isServerless) process.exit(1);
});

const startServer = async () => {
  try {
    await connectMongo();

    const PORT = process.env.PORT || 8000;
    const httpServer = http.createServer(app);
    initSocketIO(httpServer, allowedOrigins);

    return httpServer.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Server start failed:", err);
    process.exit(1);
  }
};

if (!isServerless) {
  startServer();
}

export { app, startServer };
