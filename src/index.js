import dotenv from "dotenv";

dotenv.config();

import connectMongo from "./db/index.js";
import { sqlDB } from "./db/sql.js";
import { app } from "./app.js";
import redis from "./db/redis.js";

const startServer = async () => {
  try {
    // ✅ MongoDB
    await connectMongo();

    // ✅ MySQL
    const connection = await sqlDB.getConnection();
    console.log("✅ MySQL connected");
    connection.release();

    // ✅ Redis TEST (yahan hona chahiye)
    await redis.set("test", "hello");
    const data = await redis.get("test");
    console.log("✅ Redis test:", data);

    // ✅ Server start
    app.listen(process.env.PORT || 8000, () => {
      console.log(`🚀 Server running at port : ${process.env.PORT || 8000}`);
    });

  } catch (err) {
    console.error("❌ Server start failed:", err.message);
    process.exit(1);
  }
};

console.log("ENV:", process.env.DB_USER);

startServer();