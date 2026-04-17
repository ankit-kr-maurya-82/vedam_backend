import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// ✅ ONLY allow Cloudinary / HTTPS URLs
const resolveMediaUrl = (mediaPath) => {
  if (!mediaPath) return null;

  if (/^https?:\/\//i.test(mediaPath)) {
    return mediaPath;
  }

  return null;
};

// ✅ normalize response
const normalizePost = (post, currentUserId = null) => {
  const likeIds = Array.isArray(post.likes) ? post.likes : [];
  const normalizedCurrentUserId = currentUserId ? String(currentUserId) : null;

  return {
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
  likesCount: likeIds.length,
  liked: normalizedCurrentUserId
    ? likeIds.some((likeId) => String(likeId) === normalizedCurrentUserId)
    : false,
  commentsCount: post.commentsCount || 0,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  };
};


// ==========================
// ✅ CREATE POST
// ==========================
export const createPost = asyncHandler(async (req, res) => {
  const { title, content } = req.body;

  if (!content && !req.file) {
    throw new ApiError(400, "Post cannot be empty");
  }

  let mediaUrl = null;

  if (req.file) {
    const uploadedMedia = await uploadOnCloudinary(req.file);

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

  res.status(201).json({
    success: true,
    post: normalizePost(populatedPost, req.user?._id),
  });
});


// ==========================
// ✅ GET ALL POSTS
// ==========================
export const getAllPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const isAdmin = req.user?.role === 'admin';
  const filter = isAdmin ? {} : { 
    isAdminOnly: { $ne: true },
    'owner.role': { $ne: 'admin' }
  };

  const posts = await Post.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("title content media owner likes commentsCount createdAt updatedAt")
    .populate("owner", "fullName username avatar")
    .lean();

  const normalizedPosts = posts.map((post) =>
    normalizePost(post, req.user?._id)
  );

  res.status(200).json({
    success: true,
    posts: normalizedPosts,
  });
});


// ==========================
// ✅ GET POSTS BY USERNAME
// ==========================
export const getPostsByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const isAdmin = req.user?.role === 'admin';
  const user = await User.findOne({
    username: username.trim().toLowerCase(),
    ...(isAdmin ? {} : { role: { $ne: 'admin' } })
  }).select("_id");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const posts = await Post.find({ owner: user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("owner", "fullName username avatar")
    .lean();

  const normalizedPosts = posts.map((post) =>
    normalizePost(post, req.user?._id)
  );

  res.status(200).json({
    success: true,
    posts: normalizedPosts,
  });
});


// ==========================
// ✅ GET SINGLE POST
// ==========================
export const getPostById = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId)
    .populate("owner", "fullName username avatar")
    .lean();

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  res.status(200).json({
    success: true,
    post: normalizePost(post, req.user?._id),
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
    throw new ApiError(403, "You can edit only your own post");
  }

  if (typeof title === "string") {
    post.title = title.trim() || "Untitled Post";
  }

  if (typeof content === "string") {
    post.content = content.trim();
  }

  if (req.file) {
    const uploadedMedia = await uploadOnCloudinary(req.file);

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

  res.status(200).json({
    success: true,
    post: normalizePost(updatedPost, req.user?._id),
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
    throw new ApiError(403, "You can delete only your own post");
  }

  await Post.findByIdAndDelete(postId);

  res.status(200).json({
    success: true,
    message: "Post deleted successfully",
  });
});

// ==========================
// ✅ TOGGLE LIKE POST
// ==========================
export const toggleLikePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const userLikedIndex = post.likes.findIndex(likeId => likeId.toString() === userId.toString());
  let liked;
  if (userLikedIndex > -1) {
    // Unlike
    post.likes.splice(userLikedIndex, 1);
    liked = false;
  } else {
    // Like
    post.likes.push(userId);
    liked = true;
  }

  await post.save();

  const populatedPost = await Post.findById(postId)
    .populate("owner", "fullName username avatar")
    .lean();

  res.status(200).json({
    success: true,
    data: {
      likesCount: post.likes.length,
      liked,
    },
    post: normalizePost(populatedPost, req.user?._id),
  });
});
