import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createPost,
  deletePost,
  getAllPosts,
  getPostById,
  getPostsByUsername,
  toggleLikePost,
  updatePost,
} from "../controllers/post.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.get("/", getAllPosts);
router.get("/:postId", getPostById);
router.get("/user/:username", getPostsByUsername);

router.post(
  "/",
  verifyJWT,
  upload.single("media"),
  createPost
);
router.put(
  "/:postId",
  verifyJWT,
  upload.single("media"),
  updatePost
);
router.delete("/:postId", verifyJWT, deletePost);
router.post("/:postId/like", verifyJWT, toggleLikePost);

export default router;
