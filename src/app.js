import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

/* =========================
   ✅ CORS CONFIG (FINAL)
========================= */

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : [];

const corsOptions = {
  origin: function (origin, callback) {
    console.log("🌐 Origin:", origin);

    // allow Postman / server-to-server
    if (!origin) return callback(null, true);

    // allow frontend URLs
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // ❌ block others
    return callback(new Error("❌ Not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions)); // ✅ ONLY CORS needed

/* =========================
   ✅ MIDDLEWARES
========================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

/* =========================
   ✅ ROUTES
========================= */

import userRouter from "./routes/user.routes.js";
import postRouter from "./routes/post.routes.js";
import commentRouter from "./routes/comment.routes.js";
import searchRouter from "./routes/search.routes.js";

app.get("/", (req, res) => {
  res.send("Social Media App Home Page 🚀");
});

app.use("/api/v1/users", userRouter);
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/search", searchRouter);

/* =========================
   ❌ ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("🔥 Error:", err);

  res.status(err?.statusCode || 500).json({
    success: false,
    message: err?.message || "Internal Server Error",
    errors: err?.errors || [],
  });
});

/* =========================
   ✅ EXPORT
========================= */

export { app };