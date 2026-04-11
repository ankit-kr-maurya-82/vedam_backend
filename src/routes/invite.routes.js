import express from "express";
import auth from "../middlewares/auth.middleware.js";
import {
  createInvite,
  joinViaInvite,
} from "../controllers/invite.controller.js";

const router = express.Router();

router.post("/", auth, createInvite);
router.post("/:code", auth, joinViaInvite);

export default router;
