import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const resolveMediaUrl = (mediaPath) => {
  if (!mediaPath) {
    return null;
  }

  if (/^https?:\/\//i.test(mediaPath)) {
    return mediaPath;
  }

  const normalizedPath = String(mediaPath)
    .replace(/\\/g, "/")
    .replace(/^public\//i, "")
    .replace(/^\/+/, "");

  return `http://localhost:8000/${normalizedPath}`;
};

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
  authorId: post.owner?._id ? String(post.owner._id) : String(post.owner),
  commentsCount: post.commentsCount || 0,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
});

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

  const populatedPost = await Post.findById(post._id).populate(
    "owner",
    "fullName username avatar"
  );

  res.status(201).json({
    success: true,
    post: normalizePost(populatedPost),
  });
});

export const getPostsByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const user = await User.findOne({
    username: username.trim().toLowerCase(),
  }).select("_id");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const posts = await Post.find({ owner: user._id })
    .sort({ createdAt: -1 })
    .populate("owner", "fullName username avatar");

  const normalizedPosts = posts.map(normalizePost);

  res.status(200).json({
    success: true,
    posts: normalizedPosts,
  });
});

export const getAllPosts = asyncHandler(async (_req, res) => {
  const posts = await Post.find({})
    .sort({ createdAt: -1 })
    .populate("owner", "fullName username avatar");

  res.status(200).json({
    success: true,
    posts: posts.map(normalizePost),
  });
});

export const getPostById = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId).populate(
    "owner",
    "fullName username avatar"
  );

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  res.status(200).json({
    success: true,
    post: normalizePost(post),
  });
});

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
      throw new ApiError(500, "Post media upload failed");
    }
    post.media = uploadedMedia.url;
  } else if (typeof mediaUrl === "string") {
    post.media = mediaUrl || null;
  }

  await post.save();

  const populatedPost = await Post.findById(post._id).populate(
    "owner",
    "fullName username avatar"
  );

  res.status(200).json({
    success: true,
    post: normalizePost(populatedPost),
  });
});

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

  res.status(200).json({
    success: true,
    message: "Post deleted successfully",
  });
});
