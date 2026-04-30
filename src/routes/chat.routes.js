import { Router } from "express";
import {
  getChatConversations,
  getConversationMessages,
  sendConversationMessage,
  streamChatEvents,
} from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/stream", verifyJWT, streamChatEvents);
router.use(verifyJWT);
router.get("/", getChatConversations);
router.get("/:username/messages", getConversationMessages);
router.post("/:username/messages", sendConversationMessage);

export default router;
