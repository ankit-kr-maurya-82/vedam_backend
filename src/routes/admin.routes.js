import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { checkAdmin } from "../middlewares/admin.middleware.js";

import { 
  getAdminStats, 
  getUsersList, 
  getAdminUserDetail,
  deleteUser, 
  getPostsList, 
  deletePost 
} from "../controllers/admin.controller.js";

import { getCommentsList } from "../controllers/comment.controller.js"; // ✅

const router = Router();

router.use(verifyJWT);

router.get("/stats", checkAdmin, getAdminStats);
router.get("/users", checkAdmin, getUsersList);
router.get("/users/:id", checkAdmin, getAdminUserDetail);
router.delete("/users/:id", checkAdmin, deleteUser);

router.get("/posts", checkAdmin, getPostsList);
router.delete("/posts/:id", checkAdmin, deletePost);

// ✅ COMMENTS ROUTE
router.get("/comments", checkAdmin, getCommentsList);

export default router;