import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const toRelationshipList = (items = []) =>
  items.map((item) => ({
    id: item._id,
    _id: item._id,
    username: item.username,
    fullName: item.fullName,
    avatar: item.avatar || "",
  }));

const buildPublicProfile = (profileUser, currentUserId = null) => {
  const followers = profileUser.followers || [];
  const following = profileUser.following || [];
  const viewerId = currentUserId ? String(currentUserId) : null;

  return {
    ...profileUser.toObject(),
    followers: followers.length,
    following: following.length,
    followerList: toRelationshipList(followers),
    followingList: toRelationshipList(following),
    isFollowing: viewerId
      ? followers.some((follower) => String(follower._id || follower) === viewerId)
      : false,
  };
};

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const slugifyUsername = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);

const buildCandidateUsernames = ({ username, email, fullName }) => {
  const fromUsername = slugifyUsername(username || "");
  const fromEmail = slugifyUsername(email?.split("@")[0] || "");
  const fromName = slugifyUsername(fullName || "");

  return [fromUsername, fromEmail, fromName, "user"].filter(Boolean);
};

const resolveUniqueUsername = async (input) => {
  const candidates = buildCandidateUsernames(input);

  for (const candidate of candidates) {
    const exists = await User.findOne({ username: candidate });
    if (!exists) {
      return candidate;
    }
  }

  let username;
  let exists = true;

  while (exists) {
    username = `user_${Math.random().toString(36).slice(2, 8)}`;
    exists = await User.findOne({ username });
  }

  return username;
};

const registerUser = asyncHandler(async (req, res) => {
 
    // 1. get user details from fronted
    const { fullName, email, username, password } = req.body;
    // console.log("email: ",email);

    // 2. validation - not empty
    if (
      [fullName, email, username, password].some(
        (field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }
    // if(fullName===""){
    //     throw new ApiError(400, "fullName is required")
    // }

    // 3. check if user already exists: username, email
    const existedUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existedUser) {
      return res.status(409).json({
        success: false,
        message: "User with email or username already exists",
      });
    }

    // console.log(req.files);

    // 4. check for images, check for avatar
    // const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0].coverImage?.path;

    let avatarLocalPath;
    if (
      req.files &&
      Array.isArray(req.files.avatar) &&
      req.files.avatar.length > 0
    ) {
      avatarLocalPath = req.files.avatar[0].path;
    }
    let coverImageLocalPath;
    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
    ) {
      coverImageLocalPath = req.files.coverImage[0].path;
    }

    // 5. upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    // 6.create a object - create entry in db
    const user = await User.create({
      fullName,
      avatar: avatar?.url || "",
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering the user")
     
    }

    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "User registered successfully"));
  
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  console.log("📩 Login Body:", req.body);

  // ✅ validation
  if (!email && !username) {
    throw new ApiError(400, "Email or username required");
  }

  // ✅ find user
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  console.log("👤 User found:", user);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // ✅ check password
  const isPasswordValid = await user.isPasswordCorrect(password);

  console.log("🔑 Password valid:", isPasswordValid);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  // ✅ generate tokens
  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user._id);

  // ✅ remove sensitive data
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // ✅ FIX: cookie for local + production
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  // ✅ FINAL RESPONSE (IMPORTANT)
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      success: true,
      data: {
        user: loggedInUser,
        accessToken,
        refreshToken,
      },
      message: "User logged in successfully",
    });
});

const socialLoginUser = asyncHandler(async (req, res) => {
  const {
    email,
    fullName,
    username,
    avatar = "",
    authProvider = "google",
    authProviderId = "",
  } = req.body;

  if (!email?.trim() || !fullName?.trim()) {
    throw new ApiError(400, "Email and full name are required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  let user = await User.findOne({
    $or: [{ email: normalizedEmail }, ...(authProviderId ? [{ authProviderId }] : [])],
  });

  if (!user) {
    const uniqueUsername = await resolveUniqueUsername({
      username,
      email: normalizedEmail,
      fullName,
    });

    user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      username: uniqueUsername,
      avatar,
      authProvider,
      authProviderId,
      password: crypto.randomBytes(24).toString("hex"),
    });
  } else {
    const updates = {};

    if (authProvider && user.authProvider !== authProvider) {
      updates.authProvider = authProvider;
    }
    if (authProviderId && user.authProviderId !== authProviderId) {
      updates.authProviderId = authProviderId;
    }
    if (avatar && !user.avatar) {
      updates.avatar = avatar;
    }
    if (fullName?.trim() && user.fullName !== fullName.trim()) {
      updates.fullName = fullName.trim();
    }

    if (Object.keys(updates).length > 0) {
      user = await User.findByIdAndUpdate(
        user._id,
        { $set: updates },
        { new: true, runValidators: true }
      );
    }
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")
    .populate("followers", "username fullName avatar")
    .populate("following", "username fullName avatar");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: buildPublicProfile(loggedInUser, loggedInUser._id),
          accessToken,
          refreshToken,
        },
        "Social login successful"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const getPublicUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const profileUser = await User.findOne({
    username: username.trim().toLowerCase(),
  })
    .select("-password -refreshToken")
    .populate("followers", "username fullName avatar")
    .populate("following", "username fullName avatar");

  if (!profileUser) {
    throw new ApiError(404, "User profile not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      buildPublicProfile(profileUser, req.user?._id),
      "User profile fetched successfully"
    )
  );
});

const updateUserProfile = asyncHandler(async (req, res) => {
  console.log('🔄 [DEBUG] updateUserProfile called');
  console.log('📋 Body:', req.body);
  console.log('📁 File:', req.file ? {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    bufferLength: req.file.buffer?.length
  } : 'NO FILE');
  const { fullName, username, bio } = req.body;
  const updates = {};

  if (typeof fullName === "string") {
    const trimmed = fullName.trim();
    if (!trimmed) throw new ApiError(400, "Full name cannot be empty");
    updates.fullName = trimmed;
  }

  if (typeof username === "string") {
    const normalized = username.trim().toLowerCase();
    if (!normalized) throw new ApiError(400, "Username cannot be empty");

    const exists = await User.findOne({
      username: normalized,
      _id: { $ne: req.user._id },
    });

    if (exists) {
      throw new ApiError(409, "Username already taken");
    }

    updates.username = normalized;
  }

  if (typeof bio === "string") {
    updates.bio = bio.trim();
  }

  // ✅ MEMORY STORAGE FIX (IMPORTANT)
  const avatarFile = req.file;

  if (avatarFile) {
    console.log('☁️ [DEBUG] Uploading to Cloudinary...', avatarFile.originalname);
    const uploadedAvatar = await uploadOnCloudinary(avatarFile);
    console.log('✅ [DEBUG] Cloudinary result:', uploadedAvatar ? 'SUCCESS' : 'FAILED', uploadedAvatar?.url);
    
    const avatar = uploadedAvatar;
    if (!avatar) {
      throw new ApiError(500, "Avatar upload failed");
    }
    if (!avatar?.url) {
      throw new ApiError(500, "Avatar upload failed");
    }

    updates.avatar = avatar.url;
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No profile changes provided");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  )
    .select("-password -refreshToken")
    .populate("followers", "username fullName avatar")
    .populate("following", "username fullName avatar");

  return res.status(200).json(
    new ApiResponse(
      200,
      buildPublicProfile(updatedUser, updatedUser._id),
      "Profile updated successfully"
    )
  );
});

export const updateSelfRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    req.user.role = role;
    await req.user.save();

    res.json({
      message: "Role updated successfully",
      user: req.user
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating role" });
  }
};

const toggleFollowUser = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const currentUserId = String(req.user._id);

  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const targetUser = await User.findOne({
    username: username.trim().toLowerCase(),
  }).populate("followers", "username fullName avatar");

  if (!targetUser) {
    throw new ApiError(404, "User profile not found");
  }

  if (String(targetUser._id) === currentUserId) {
    throw new ApiError(400, "You cannot follow yourself");
  }

  const isFollowing = (targetUser.followers || []).some(
    (follower) => String(follower._id || follower) === currentUserId
  );

  const update = isFollowing
    ? {
        $pull: {
          followers: req.user._id,
        },
      }
    : {
        $addToSet: {
          followers: req.user._id,
        },
      };

  const currentUserUpdate = isFollowing
    ? {
        $pull: {
          following: targetUser._id,
        },
      }
    : {
        $addToSet: {
          following: targetUser._id,
        },
      };

  await Promise.all([
    User.findByIdAndUpdate(targetUser._id, update),
    User.findByIdAndUpdate(req.user._id, currentUserUpdate),
  ]);

  const [updatedTargetUser, updatedCurrentUser] = await Promise.all([
    User.findById(targetUser._id)
      .select("-password -refreshToken")
      .populate("followers", "username fullName avatar")
      .populate("following", "username fullName avatar"),
    User.findById(req.user._id)
      .select("-password -refreshToken")
      .populate("followers", "username fullName avatar")
      .populate("following", "username fullName avatar"),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        profile: buildPublicProfile(updatedTargetUser, req.user._id),
        currentUser: buildPublicProfile(updatedCurrentUser, req.user._id),
      },
      isFollowing ? "User unfollowed successfully" : "User followed successfully"
    )
  );
});

export {
  registerUser,
  loginUser,
  socialLoginUser,
  logoutUser,
  refreshAccessToken,
  getPublicUserProfile,
  updateUserProfile,
  toggleFollowUser,
};
