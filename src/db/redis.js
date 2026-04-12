import { createClient } from "redis";

const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.on("error", (err) => {
  console.error("❌ Redis Error:", err.message);
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

// 🔥 IMPORTANT (connect once)
(async () => {
  if (!redis.isOpen) {
    await redis.connect();
  }
})();

export default redis;