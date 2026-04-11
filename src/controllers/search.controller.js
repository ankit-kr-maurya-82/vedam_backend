import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const globalSearch = asyncHandler(async (req, res) => {
  const query = String(req.query.q || "").trim();

  if (!query) {
    return res.status(200).json({
      success: true,
      users: [],
      posts: [],
    });
  }

  const pattern = new RegExp(escapeRegex(query), "i");

  const [users, posts] = await Promise.all([
    User.find({
      $or: [{ username: pattern }, { fullName: pattern }, { email: pattern }],
    })
      .select("fullName username avatar email")
      .limit(8),
    Post.find({
      $or: [{ title: pattern }, { content: pattern }],
    })
      .populate("owner", "fullName username avatar")
      .sort({ createdAt: -1 })
      .limit(12),
  ]);

  const normalizedPosts = posts.map((post) => ({
    id: String(post._id),
    _id: String(post._id),
    title: post.title || "Untitled Post",
    content: post.content,
    media: post.media
      ? {
          type: /\.(mp4|webm|ogg)$/i.test(post.media) ? "video" : "image",
          url: post.media,
        }
      : null,
    tags: [],
    username: post.owner?.username || "unknown_user",
    fullName: post.owner?.fullName || "Unknown User",
    avatar: post.owner?.avatar || "",
    authorId: post.owner?._id ? String(post.owner._id) : null,
    commentsCount: post.commentsCount || 0,
    createdAt: post.createdAt,
  }));

  res.status(200).json({
    success: true,
    users,
    posts: normalizedPosts,
  });
});
