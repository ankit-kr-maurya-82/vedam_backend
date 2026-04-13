import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

const updateSelfRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  
  if (!['user', 'admin'].includes(role)) {
    throw new ApiError(400, "Invalid role");
  }
  
  // For dev setup - allow self-assign once
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { role },
    { new: true, runValidators: true }
  ).select("-password -refreshToken");

  return res.json(
    new ApiResponse(200, user, "Role updated")
  );
});

export { updateSelfRole };

