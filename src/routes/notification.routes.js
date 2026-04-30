import { Router } from "express";
import {
  getNotifications,
  markAsRead,
} from "../controllers/notification.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", verifyJWT, getNotifications);
router.patch("/:id/read", verifyJWT, markAsRead);

export default router;
