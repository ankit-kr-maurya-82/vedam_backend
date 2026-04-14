import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.post("/signup", upload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "coverImage", maxCount: 1 }
]), asyncHandler(async (req, res) => {
  req.body.adminAccessKey = ADMIN_ACCESS_KEY;
  await registerUser(req, res);
}));

export default router;

