import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";

/* =========================
   ✅ CREATE COMMENT
========================= */
const createComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Comment content is required");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const comment = await Comment.create({
    content,
    post: postId,
    owner: req.user._id
  });

  return res.status(201).json(
    new ApiResponse(201, comment, "Comment created successfully")
  );
});

/* =========================
   ✅ GET COMMENTS BY POST
========================= */
const getCommentsByPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const comments = await Comment.find({ post: postId })
    .populate("owner", "username fullName avatar")
    .sort({ createdAt: -1 });

  return res.json(
    new ApiResponse(200, comments, "Comments fetched")
  );
});

/* =========================
   ✅ ADMIN: GET ALL COMMENTS
========================= */
const getCommentsList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;
  const skip = (page - 1) * limit;
  const normalizedSearch = String(search || "").trim();
  let filter = {};

  if (normalizedSearch) {
    const [matchingUsers, matchingPosts] = await Promise.all([
      User.find({
        $or: [
          { username: { $regex: normalizedSearch, $options: "i" } },
          { fullName: { $regex: normalizedSearch, $options: "i" } },
        ],
      }).select("_id"),
      Post.find({
        title: { $regex: normalizedSearch, $options: "i" },
      }).select("_id"),
    ]);

    const matchingOwnerIds = matchingUsers.map((user) => user._id);
    const matchingPostIds = matchingPosts.map((post) => post._id);

    filter = {
      $or: [
        { content: { $regex: normalizedSearch, $options: "i" } },
        ...(matchingOwnerIds.length > 0
          ? [{ owner: { $in: matchingOwnerIds } }]
          : []),
        ...(matchingPostIds.length > 0
          ? [{ post: { $in: matchingPostIds } }]
          : []),
      ],
    };
  }

  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .populate("owner", "username fullName")
      .populate("post", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Comment.countDocuments(filter),
  ]);

  return res.json(
    new ApiResponse(200, {
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  );
});

/* =========================
   ✅ DELETE COMMENT (SECURE)
========================= */
const deleteComment = asyncHandler(async (req, res) => {
  const commentId = req.params.commentId || req.params.id;

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // ✅ Only owner OR admin
  if (
    comment.owner.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    throw new ApiError(403, "Not authorized");
  }

  await comment.deleteOne();

  return res.json(
    new ApiResponse(200, {}, "Comment deleted successfully")
  );
});

export {
  createComment,
  getCommentsByPost,
  getCommentsList,
  deleteComment
};
