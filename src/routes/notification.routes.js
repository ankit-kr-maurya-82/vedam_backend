import express from "express"
import auth from "../middlewares/auth.middleware.js";
import { getNotifications, markAsRead } from "../controllers/notification.controller";



const router = express.Router();

router.get("/", auth, getNotifications);
router.patch("/:id/read", auth, markAsRead);

export default router