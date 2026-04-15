import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

/* =========================
   ✅ CORS FIX (PRODUCTION + LOCAL)
========================= */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://vedam-frontend.vercel.app",
  "https://vedam-fronted.vercel.app",
  "https://vedam.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // console.log("🌐 Origin:", origin);
      // Vercel + Local + any origin (development)
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

/* ✅ IMPORTANT: Preflight handled automatically by cors() */

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
import adminRouter from "./routes/admin.routes.js";
import adminSignupRouter from "./routes/adminSignup.routes.js";

app.get("/", (req, res) => {
  res.send("Social Media App Home Page 🚀");
});

app.use("/api/v1/users", userRouter);
app.use("/api/v1/admin/signup", adminSignupRouter);
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/admin", adminRouter);
/* =========================
   ❌ ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.message);

  res.status(err?.statusCode || 500).json({
    success: false,
    message: err?.message || "Internal Server Error",
  });
});

export { app };