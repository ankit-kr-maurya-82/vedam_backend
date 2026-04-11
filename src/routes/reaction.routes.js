import express from "express";
import auth from "../middlewares/auth.middleware.js";
import { toggleReaction } from "../controllers/reaction.controller.js";

const router = express.Router();

router.post("/", auth, toggleReaction);

export default router;
