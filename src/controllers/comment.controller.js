import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Comment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";

export const getCommentsByPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Invalid post id");
  }

  const comments = await Comment.find({ post: postId })
    .populate("owner", "fullName username avatar")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    comments,
  });
});

export const createComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Invalid post id");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Comment cannot be empty");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const comment = await Comment.create({
    content: content.trim(),
    owner: req.user._id,
    post: postId,
  });

  post.commentsCount += 1;
  await post.save({ validateBeforeSave: false });

  const populatedComment = await Comment.findById(comment._id).populate(
    "owner",
    "fullName username avatar"
  );

  res.status(201).json({
    success: true,
    comment: populatedComment,
  });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (String(comment.owner) !== String(req.user._id)) {
    throw new ApiError(403, "You can delete only your own comment");
  }

  await Comment.findByIdAndDelete(commentId);
  await Post.findByIdAndUpdate(comment.post, {
    $inc: { commentsCount: -1 },
  });

  res.status(200).json({
    success: true,
    message: "Comment deleted",
  });
});
