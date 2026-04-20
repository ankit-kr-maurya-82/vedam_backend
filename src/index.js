import "dotenv/config";
import { fileURLToPath } from "url";
import { app } from "./app.js";
import connectMongo from "./db/index.js";

const isServerless = Boolean(process.env.VERCEL);
const isDirectRun =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === process.argv[1];

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
    return app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Server start failed:", err);
    process.exit(1);
  }
};

if (isDirectRun && !isServerless) {
  startServer();
}

export default async function handler(req, res) {
  try {
    await connectMongo();
    return app(req, res);
  } catch (err) {
    console.error("Request bootstrap failed:", err);
    return res.status(500).json({
      success: false,
      message: "Server initialization failed",
    });
  }
}

export { app, startServer };
