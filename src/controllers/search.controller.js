import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const MONTH_INDEX = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const buildDateRangeFromQuery = (input) => {
  const query = String(input || "").trim().toLowerCase();
  if (!query) return null;

  const exactIsoMatch = query.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (exactIsoMatch) {
    const [, year, month, day] = exactIsoMatch;
    const start = new Date(Number(year), Number(month) - 1, Number(day));
    const end = new Date(Number(year), Number(month) - 1, Number(day) + 1);
    return { start, end };
  }

  const slashMatch = query.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const start = new Date(Number(year), Number(month) - 1, Number(day));
    const end = new Date(Number(year), Number(month) - 1, Number(day) + 1);
    return { start, end };
  }

  const monthYearMatch = query.match(
    /^(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{4})$/
  );
  if (monthYearMatch) {
    const [, monthName, year] = monthYearMatch;
    const monthIndex = MONTH_INDEX[monthName];
    const start = new Date(Number(year), monthIndex, 1);
    const end = new Date(Number(year), monthIndex + 1, 1);
    return { start, end };
  }

  const yearMatch = query.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    return {
      start: new Date(year, 0, 1),
      end: new Date(year + 1, 0, 1),
    };
  }

  const parsed = new Date(query);
  if (!Number.isNaN(parsed.getTime())) {
    const start = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    const end = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate() + 1);
    return { start, end };
  }

  return null;
};

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
  const dateRange = buildDateRangeFromQuery(query);

  const [users, posts] = await Promise.all([
    User.find({
      $or: [{ username: pattern }, { fullName: pattern }, { email: pattern }],
    })
      .select("fullName username avatar email")
      .limit(8),
    Post.find({
      $or: [
        { title: pattern },
        { content: pattern },
        ...(dateRange
          ? [{ createdAt: { $gte: dateRange.start, $lt: dateRange.end } }]
          : []),
      ],
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
    media: post.media ? {
      type: /\.(mp4|webm|ogg)$/i.test(post.media) ? "video" : "image",
      url: post.media,
    } : null,
    formattedDate: new Date(post.createdAt).toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
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
