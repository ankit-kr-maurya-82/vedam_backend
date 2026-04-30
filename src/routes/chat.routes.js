import { Router } from "express";
import {
  deleteConversationMessage,
  getChatConversations,
  getConversationMessages,
  sendConversationMessage,
  streamChatEvents,
  updateConversationMessage,
} from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/stream", verifyJWT, streamChatEvents);
router.use(verifyJWT);
router.get("/", getChatConversations);
router.get("/:username/messages", getConversationMessages);
router.post("/:username/messages", sendConversationMessage);
router.patch("/:username/messages/:messageId", updateConversationMessage);
router.delete("/:username/messages/:messageId", deleteConversationMessage);

export default router;
