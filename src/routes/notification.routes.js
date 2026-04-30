import { Router } from "express";
import {
  getNotifications,
  getPushPublicKey,
  markAsRead,
  removePushSubscription,
  savePushSubscription,
} from "../controllers/notification.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/push/public-key", verifyJWT, getPushPublicKey);
router.post("/push/subscribe", verifyJWT, savePushSubscription);
router.delete("/push/subscribe", verifyJWT, removePushSubscription);
router.get("/", verifyJWT, getNotifications);
router.patch("/:id/read", verifyJWT, markAsRead);

export default router;
