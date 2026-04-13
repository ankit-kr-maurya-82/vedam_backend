import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { checkAdmin } from "../middlewares/admin.middleware.js";
import { 
  getAdminStats, 
  getUsersList, 
  deleteUser, 
  getPostsList, 
  deletePost 
} from "../controllers/admin.controller.js";

const router = Router();

router.use(verifyJWT);

router.get("/stats", checkAdmin, getAdminStats);
router.get("/users", checkAdmin, getUsersList);
router.delete("/users/:id", checkAdmin, deleteUser);
router.get("/posts", checkAdmin, getPostsList);
router.delete("/posts/:id", checkAdmin, deletePost);

export default router;

