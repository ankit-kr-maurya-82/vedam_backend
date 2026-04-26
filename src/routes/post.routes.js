import { Router } from "express";
import { optionalVerifyJWT, verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createPost,
  deletePost,
  getAllPosts,
  getPostById,
  getPostsByUsername,
  incrementPostViews,
  toggleLikePost,
  updatePost,
} from "../controllers/post.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.get("/", optionalVerifyJWT, getAllPosts);
router.get("/:postId", optionalVerifyJWT, getPostById);
router.get("/user/:username", optionalVerifyJWT, getPostsByUsername);
router.post("/:postId/view", optionalVerifyJWT, incrementPostViews);

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
