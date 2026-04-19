import "dotenv/config";
import { app } from "./app.js";
import connectMongo from "./db/index.js";

// 🔥 Handle crashes
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  process.exit(1);
});

const startServer = async () => {
  try {
    // ✅ Connect MongoDB **ALWAYS** (Vercel + local)
    await connectMongo();
    console.log("✅ MongoDB connected");

    // Local only: Start HTTP server
    if (typeof process.env.VERCEL === "undefined") {
      const PORT = process.env.PORT || 8000;
      const server = app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
      });
      return server;
    }
  } catch (err) {
    console.error("❌ Server start failed:", err.message);
    process.exit(1);
  }
};

startServer();

export { app };
