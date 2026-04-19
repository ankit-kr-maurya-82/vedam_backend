import "dotenv/config";
import app from "./app.js";

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  process.exit(1);
});

export default app;

// Local server only
if (typeof process.env.VERCEL === "undefined") {
  const connectMongo = await import("./db/index.js").then(m => m.default || m.connectMongo);
  connectMongo();
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}
