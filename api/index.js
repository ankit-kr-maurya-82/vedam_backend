import "dotenv/config";
import { app } from "../src/app.js";
import connectMongo from "../src/db/index.js";

export default async function handler(req, res) {
  try {
    await connectMongo();
    return app(req, res);
  } catch (error) {
    console.error("Serverless bootstrap failed:", error);
    return res.status(500).json({
      success: false,
      message: "Server initialization failed",
    });
  }
}
