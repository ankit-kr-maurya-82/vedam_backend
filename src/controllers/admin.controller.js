import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";

const parseAdminListQuery = (pageValue, limitValue) => {
  const page = Math.max(Number.parseInt(pageValue, 10) || 1, 1);
  const normalizedLimit = String(limitValue ?? 10).trim().toLowerCase();
  const shouldReturnAll = normalizedLimit === "all";
  const limit = shouldReturnAll ? null : Math.max(Number.parseInt(limitValue, 10) || 10, 1);
  const skip = shouldReturnAll ? 0 : (page - 1) * limit;

  return { page, limit, skip, shouldReturnAll };
};

const getAdminStats = asyncHandler(async (req, res) => {
  const [userCount, postCount, commentCount, likesAggregate] = await Promise.all([
    User.countDocuments(),
    Post.countDocuments(),
    Comment.countDocuments(),
    Post.aggregate([
      {
        $project: {
          likesCount: { $size: { $ifNull: ["$likes", []] } },
        },
      },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: "$likesCount" },
        },
      },
    ]),
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
      totalLikes: likesAggregate[0]?.totalLikes || 0,
      recentUsers,
      recentPosts
    })
  );
});

const getUsersList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;
  const { page: currentPage, limit: currentLimit, skip, shouldReturnAll } = parseAdminListQuery(
    page,
    limit
  );

  const filter = search 
    ? {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } }
        ]
      }
    : {};

  const usersQuery = User.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .select("-password -refreshToken");

  if (!shouldReturnAll) {
    usersQuery.limit(currentLimit);
  }

  const [users, total] = await Promise.all([usersQuery, User.countDocuments(filter)]);

  return res.json(
    new ApiResponse(200, {
      users,
      pagination: {
        page: currentPage,
        limit: shouldReturnAll ? total : currentLimit,
        total,
        pages: shouldReturnAll ? (total > 0 ? 1 : 0) : Math.ceil(total / currentLimit)
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
  const { page: currentPage, limit: currentLimit, skip, shouldReturnAll } = parseAdminListQuery(
    page,
    limit
  );
  const normalizedSearch = String(search || "").trim();
  let filter = {};

  if (normalizedSearch) {
    const matchingUsers = await User.find({
      $or: [
        { username: { $regex: normalizedSearch, $options: "i" } },
        { fullName: { $regex: normalizedSearch, $options: "i" } },
      ],
    }).select("_id");

    const matchingOwnerIds = matchingUsers.map((user) => user._id);

    filter = {
      $or: [
        { title: { $regex: normalizedSearch, $options: "i" } },
        { content: { $regex: normalizedSearch, $options: "i" } },
        ...(matchingOwnerIds.length > 0
          ? [{ owner: { $in: matchingOwnerIds } }]
          : []),
      ],
    };
  }

  const postsQuery = Post.find(filter)
    .populate("owner", "username fullName")
    .sort({ createdAt: -1 })
    .skip(skip);

  if (!shouldReturnAll) {
    postsQuery.limit(currentLimit);
  }

  const [posts, total] = await Promise.all([postsQuery, Post.countDocuments(filter)]);

  return res.json(
    new ApiResponse(200, {
      posts,
      pagination: {
        page: currentPage,
        limit: shouldReturnAll ? total : currentLimit,
        total,
        pages: shouldReturnAll ? (total > 0 ? 1 : 0) : Math.ceil(total / currentLimit)
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
