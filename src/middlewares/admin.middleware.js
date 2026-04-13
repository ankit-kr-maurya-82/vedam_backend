import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const checkAdmin = asyncHandler(async (req, res, next) => {
  // ❌ Not logged in
  if (!req.user) {
    throw new ApiError(401, "Unauthorized - Login required");
  }

  // ❌ Not admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Admin access required");
  }

  // ✅ Allowed
  next();
});