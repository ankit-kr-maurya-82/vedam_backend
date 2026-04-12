import dotenv from "dotenv";

dotenv.config();
import connectMongo from "./db/index.js";
import { sqlDB } from "./db/sql.js";
import { app } from "./app.js";


const startServer = async () => {
  try {
    // ✅ MongoDB connect
    await connectMongo();

    // ✅ MySQL connect (test)
    const connection = await sqlDB.getConnection();
    console.log("✅ MySQL connected");
    connection.release();

    // ✅ Start server
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