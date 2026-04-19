import "dotenv/config";
import connectMongo from "./db/index.js";
import app from "./app.js";

// 🔥 Handle crashes
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  process.exit(1);
});

const PORT = process.env.PORT || 8000;

// Only start server if not Vercel (serverless)
if (typeof process.env.VERCEL === "undefined") {
  const startServer = async () => {
    try {
      // ✅ Connect MongoDB
      await connectMongo();
      console.log("✅ MongoDB connected");

      // ✅ Start server
      const server = app.listen(PORT, () => {
        console.log(`🚀 Server running at port: ${PORT}`);
      });

    } catch (err) {
      console.error("❌ Server start failed:", err.message);
      process.exit(1);
    }
  };

  startServer();
}

export default app;
