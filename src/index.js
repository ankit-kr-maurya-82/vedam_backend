import "dotenv/config";
import connectMongo from "./db/index.js";
import { app } from "./app.js";

// For Vercel Serverless (no listen)
export default async function handler(req, res) {
  try {
    await connectMongo();
    return app(req, res);
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// For local dev
if (require.main === module) {
  const startServer = async () => {
    try {
      await connectMongo();
      console.log("✅ MongoDB connected");

      const PORT = process.env.PORT || 8000;
      app.listen(PORT, () => {
        console.log(`🚀 Server running at port: ${PORT}`);
      });
    } catch (err) {
      console.error("❌ Server start failed:", err.message);
      process.exit(1);
    }
  };
  startServer();
}

