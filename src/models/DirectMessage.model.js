import mongoose, { Schema } from "mongoose";

const directMessageSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

directMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
directMessageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });

export const DirectMessage = mongoose.model(
  "DirectMessage",
  directMessageSchema
);
