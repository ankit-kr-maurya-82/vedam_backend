import express from "express";
import auth from "../middlewares/auth.middleware.js";
import {
  createServer,
  getMyServers,
  joinServer,
  leaveServer,
} from "../controllers/server.controller.js";

const router = express.Router();

router.post("/", auth, createServer);
router.get("/", auth, getMyServers);
router.post("/:id/join", auth, joinServer);
router.post("/:id/leave", auth, leaveServer);

export default router;
