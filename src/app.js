import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    // allow requests from this origin
    credentials: true,               // allow cookies

}))

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(express.static("public"))
app.use(cookieParser())

// routes import

import userRouter from "./routes/user.routes.js"
import postRouter from "./routes/post.routes.js"
import commentRouter from "./routes/comment.routes.js"
import searchRouter from "./routes/search.routes.js"


// routes declaration
app.get('/', (req, res)=> {
    res.send("Social Media App Home Page")
})
app.use("/api/v1/users", userRouter)
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/search", searchRouter);
// console.log("Posts routes loaded");

app.use((err, req, res, next) => {
    const statusCode = err?.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message: err?.message || "Internal server error",
        errors: err?.errors || [],
    });
});

export  { app }
