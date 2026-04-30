import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

// ✅ REQUIRED AUTH (protected routes)
export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.headers.authorization?.split(" ")[1] ||
    req.query?.accessToken;

  if (!token) {
    throw new ApiError(401, "Access token missing");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired access token");
  }

  const user = await User.findById(decoded._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  req.user = user; // 🔥 IMPORTANT

  next();
});

// 🟡 OPTIONAL AUTH (public routes with optional login)
export const optionalVerifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.headers.authorization?.split(" ")[1] ||
    req.query?.accessToken;

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (user) req.user = user;
  } catch {
    req.user = undefined;
  }

  next();
});
