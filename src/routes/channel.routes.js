import express from "express";
import auth from "../middlewares/auth.middleware.js";
import {
  createChannel,
  getServerChannels,
  updateChannel,
  deleteChannel,
} from "../controllers/channel.controller.js";

const router = express.Router();

router.post("/", auth, createChannel);
router.get("/server/:serverId", auth, getServerChannels);
router.put("/:id", auth, updateChannel);
router.delete("/:id", auth, deleteChannel);

export default router;
