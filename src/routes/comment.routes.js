import { Router } from "express";
import {
  createComment,
  deleteComment,
  getCommentsByPost,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/post/:postId", getCommentsByPost);
router.post("/post/:postId", verifyJWT, createComment);
router.delete("/:commentId", verifyJWT, deleteComment);

export default router;
