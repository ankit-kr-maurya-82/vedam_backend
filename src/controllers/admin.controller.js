import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";

const getAdminStats = asyncHandler(async (req, res) => {
  const [userCount, postCount, commentCount] = await Promise.all([
    User.countDocuments(),
    Post.countDocuments(),
    Comment.countDocuments()
  ]);

  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("username email fullName avatar createdAt");

  const recentPosts = await Post.find()
    .populate("owner", "username fullName avatar")
    .sort({ createdAt: -1 })
    .limit(5)
    .select("title content owner createdAt");

  return res.json(
    new ApiResponse(200, {
      totalUsers: userCount,
      totalPosts: postCount,
      totalComments: commentCount,
      recentUsers,
      recentPosts
    })
  );
});

const getUsersList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;
  const skip = (page - 1) * limit;

  const filter = search 
    ? {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } }
        ]
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-password -refreshToken"),
    User.countDocuments(filter)
  ]);

  return res.json(
    new ApiResponse(200, {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  );
});

const getAdminUserDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select("-password");

  const articles = await Post.find({ owner: id })
    .populate("owner", "username avatar")
    .sort({ createdAt: -1 });

  res.json({
    user,
    articles,
    postsCount: articles.length,
    followersCount: user.followers.length
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const targetUser = await User.findById(id);
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }
  
  if (targetUser.role === 'admin') {
    throw new ApiError(403, "Cannot delete admin users");
  }
  
  await User.findByIdAndDelete(id);
  
  return res.json(
    new ApiResponse(200, {}, "User deleted successfully")
  );
});

const getPostsList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;
  const skip = (page - 1) * limit;

  const filter = search 
    ? { title: { $regex: search, $options: 'i' } }
    : {};

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .populate("owner", "username fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Post.countDocuments(filter)
  ]);

  return res.json(
    new ApiResponse(200, {
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  );
});

const deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await Post.findByIdAndDelete(id);
  
  return res.json(
    new ApiResponse(200, {}, "Post deleted successfully")
  );
});

export {
  getAdminStats,
  getUsersList,
  getAdminUserDetail,
  deleteUser,
  getPostsList,
  deletePost
};
