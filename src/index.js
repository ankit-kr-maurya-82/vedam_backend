import dotenv from "dotenv";
dotenv.config();

import connectMongo from "./db/index.js";
import { app } from "./app.js";
import "./db/redis.js"; // auto connect Redis

const startServer = async () => {
  try {
    // ✅ MongoDB
    await connectMongo();

    // ❌ SQL removed

    // ✅ Start server
    app.listen(process.env.PORT || 8000, () => {
      console.log(`🚀 Server running at port : ${process.env.PORT || 8000}`);
    });

  } catch (err) {
    console.error("❌ Server start failed:", err.message);
  }
};

startServer();