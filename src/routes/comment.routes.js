import { Router } from "express";
import {
  createComment,
  deleteComment,
  getCommentsByPost,
  getCommentsList
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { checkAdmin } from "../middlewares/admin.middleware.js";

const router = Router();

/* =========================
   🌐 PUBLIC ROUTES
========================= */

// Get comments for a post
router.get("/post/:postId", getCommentsByPost);


/* =========================
   🔐 USER ROUTES
========================= */

// Create comment
router.post("/post/:postId", verifyJWT, createComment);

// Delete own comment (or admin)
router.delete("/:commentId", verifyJWT, deleteComment);


/* =========================
   🔐 ADMIN ROUTES
========================= */

// Get all comments (admin panel)
router.get("/", verifyJWT, checkAdmin, getCommentsList);

export default router;