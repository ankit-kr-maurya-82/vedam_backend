import { Router } from "express"
import {
    getPublicUserProfile,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    socialLoginUser,
    updateUserProfile,
    toggleFollowUser
} from "../controllers/user.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import { optionalVerifyJWT, verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        },
    ]),
    registerUser)

router.route("/login").post(loginUser)
router.route("/social-login").post(socialLoginUser)
router.route("/profile/:username").get(optionalVerifyJWT, getPublicUserProfile)
router.route("/profile/:username/follow").post(verifyJWT, toggleFollowUser)
router.route("/profile").patch(
    verifyJWT,
    upload.single("avatar"),
    updateUserProfile
)


// secure routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

export default router
