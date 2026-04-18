import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "Untitled Post",
    },
    content: {
      type: String,
      trim: true,
      maxlength: 100000000000000
    },
    media: {
      type: String, // Cloudinary URL (image or video)
      default: null,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    commentsCount: {
      type: Number,
      default: 0,
    },
    isAdminOnly: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

export const Post = mongoose.model("Post", postSchema);
