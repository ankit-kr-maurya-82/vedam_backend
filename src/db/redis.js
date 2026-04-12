import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // prevents crash on retry
  retryStrategy(times) {
    console.log(`🔁 Redis retry attempt: ${times}`);
    return Math.min(times * 100, 3000); // retry delay
  },
  reconnectOnError(err) {
    const targetErrors = ["READONLY", "ECONNRESET", "ETIMEDOUT"];
    if (targetErrors.some(e => err.message.includes(e))) {
      return true; // reconnect
    }
    return false;
  }
});

// ✅ Connected
redis.on("connect", () => {
  console.log("✅ Redis connected");
});

// ❌ Error
redis.on("error", (err) => {
  console.error("❌ Redis Error:", err.message);
});

// 🔁 Reconnecting
redis.on("reconnecting", () => {
  console.log("🔄 Redis reconnecting...");
});

// 🔚 Connection closed
redis.on("end", () => {
  console.log("⚠️ Redis connection closed");
});

export default redis;