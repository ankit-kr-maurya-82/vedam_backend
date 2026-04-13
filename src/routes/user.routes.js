import { Router } from "express";
import {
  getPublicUserProfile,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  socialLoginUser,
  updateUserProfile,
  toggleFollowUser,
  updateSelfRole
} from "../controllers/user.controller.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT, optionalVerifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// ✅ Register
router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }
  ]),
  registerUser
);

// ✅ Login
router.route("/login").post(loginUser);
router.route("/social-login").post(socialLoginUser);

// ✅ Public profile (optional login)
router.route("/profile/:username").get(optionalVerifyJWT, getPublicUserProfile);

// ✅ Follow user (login required)
router.route("/profile/:username/follow").post(verifyJWT, toggleFollowUser);

// ✅ Update profile
router.route("/profile").patch(
  verifyJWT,
  upload.single("avatar"),
  updateUserProfile
);

// ✅ Test upload
router.route("/test-upload").post(
  upload.single("avatar"),
  (req, res) => {
    console.log("🧪 TEST UPLOAD:", req.file?.originalname);
    res.json({
      message: "File received",
      file: req.file
        ? { name: req.file.originalname, size: req.file.size }
        : null
    });
  }
);

// ✅ Logout
router.route("/logout").post(verifyJWT, logoutUser);

// ✅ Refresh token
router.route("/refresh-token").post(refreshAccessToken);

// ✅ Update role
router.route("/me/role").patch(verifyJWT, updateSelfRole);

export default router;