import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import redis from "../db/redis.js";

// ✅ ONLY allow Cloudinary / HTTPS URLs
const resolveMediaUrl = (mediaPath) => {
  if (!mediaPath) return null;

  if (/^https?:\/\//i.test(mediaPath)) {
    return mediaPath;
  }

  return null; // ❌ block localhost/blob
};

// ✅ normalize response
const normalizePost = (post) => ({
  id: String(post._id),
  _id: String(post._id),
  title: post.title || "Untitled Post",
  content: post.content,
  media: resolveMediaUrl(post.media)
    ? {
        type: /\.(mp4|webm|ogg)$/i.test(post.media) ? "video" : "image",
        url: resolveMediaUrl(post.media),
      }
    : null,
  tags: [],
  username: post.owner?.username || "unknown_user",
  fullName: post.owner?.fullName || "Unknown User",
  avatar: post.owner?.avatar || "",
  authorId: post.owner?._id
    ? String(post.owner._id)
    : String(post.owner),
  commentsCount: post.commentsCount || 0,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
});


// ==========================
// ✅ CREATE POST
// ==========================
export const createPost = asyncHandler(async (req, res) => {
  const { title, content } = req.body;

  if (!content && !req.file) {
    throw new ApiError(400, "Post cannot be empty");
  }

  let mediaUrl = null;

  if (req.file?.path) {
    const uploadedMedia = await uploadOnCloudinary(req.file.path);

    if (!uploadedMedia?.url) {
      throw new ApiError(500, "Post media upload failed");
    }

    mediaUrl = uploadedMedia.url;
  }

  const post = await Post.create({
    title: title?.trim() || "Untitled Post",
    content: content?.trim() || "",
    media: mediaUrl,
    owner: req.user._id,
  });

  const populatedPost = await Post.findById(post._id)
    .populate("owner", "fullName username avatar")
    .lean();

  // 🔥 CLEAR CACHE
  await redis.del("ALL_POSTS_FEED");

  res.status(201).json({
    success: true,
    post: normalizePost(populatedPost),
  });
});


// ==========================
// ✅ GET ALL POSTS (FEED)
// ==========================
export const getAllPosts = asyncHandler(async (req, res) => {
  const CACHE_KEY = "ALL_POSTS_FEED";

  // 🔥 CACHE CHECK
  const cached = await redis.get(CACHE_KEY);

  if (cached) {
    console.log("⚡ Redis feed");
    return res.status(200).json({
      success: true,
      posts: JSON.parse(cached),
      cached: true,
    });
  }

  // 🔥 PAGINATION
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const posts = await Post.find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("title content media owner createdAt")
    .populate("owner", "fullName username avatar")
    .lean();

  const normalizedPosts = posts.map(normalizePost);

  // 🔥 STORE CACHE
  await redis.set(CACHE_KEY, JSON.stringify(normalizedPosts), {
    EX: 60,
  });

  console.log("🐢 DB feed");

  res.status(200).json({
    success: true,
    posts: normalizedPosts,
    cached: false,
  });
});


// ==========================
// ✅ GET POSTS BY USER
// ==========================
export const getPostsByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const CACHE_KEY = `USER_POSTS_${username}`;

  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    return res.status(200).json({
      success: true,
      posts: JSON.parse(cached),
      cached: true,
    });
  }

  const user = await User.findOne({
    username: username.trim().toLowerCase(),
  }).select("_id");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const posts = await Post.find({ owner: user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("owner", "fullName username avatar")
    .lean();

  const normalizedPosts = posts.map(normalizePost);

  await redis.set(CACHE_KEY, JSON.stringify(normalizedPosts), {
    EX: 60,
  });

  res.status(200).json({
    success: true,
    posts: normalizedPosts,
    cached: false,
  });
});


// ==========================
// ✅ GET SINGLE POST
// ==========================
export const getPostById = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const CACHE_KEY = `POST_${postId}`;

  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    return res.status(200).json({
      success: true,
      post: JSON.parse(cached),
      cached: true,
    });
  }

  const post = await Post.findById(postId)
    .populate("owner", "fullName username avatar")
    .lean();

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const normalized = normalizePost(post);

  await redis.set(CACHE_KEY, JSON.stringify(normalized), {
    EX: 120,
  });

  res.status(200).json({
    success: true,
    post: normalized,
    cached: false,
  });
});


// ==========================
// ✅ UPDATE POST
// ==========================
export const updatePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { title, content, mediaUrl } = req.body;

  const post = await Post.findById(postId);

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  if (String(post.owner) !== String(req.user._id)) {
    throw new ApiError(403, "You can edit only your own article");
  }

  if (typeof title === "string") {
    post.title = title.trim() || "Untitled Post";
  }

  if (typeof content === "string") {
    post.content = content.trim();
  }

  if (req.file?.path) {
    const uploadedMedia = await uploadOnCloudinary(req.file.path);

    if (!uploadedMedia?.url) {
      throw new ApiError(500, "Media upload failed");
    }

    post.media = uploadedMedia.url;
  } else if (typeof mediaUrl === "string") {
    post.media = mediaUrl || null;
  }

  await post.save();

  const updatedPost = await Post.findById(post._id)
    .populate("owner", "fullName username avatar")
    .lean();

  // 🔥 CLEAR CACHE
  await redis.del("ALL_POSTS_FEED");
  await redis.del(`POST_${postId}`);

  res.status(200).json({
    success: true,
    post: normalizePost(updatedPost),
  });
});


// ==========================
// ✅ DELETE POST
// ==========================
export const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId);

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  if (String(post.owner) !== String(req.user._id)) {
    throw new ApiError(403, "You can delete only your own article");
  }

  await Post.findByIdAndDelete(postId);

  // 🔥 CLEAR CACHE
  await redis.del("ALL_POSTS_FEED");
  await redis.del(`POST_${postId}`);

  res.status(200).json({
    success: true,
    message: "Post deleted successfully",
  });
});