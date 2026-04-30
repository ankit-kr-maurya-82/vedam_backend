import mongoose, { Schema } from "mongoose";

const pushSubscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    expirationTime: {
      type: Number,
      default: null,
    },
    keys: {
      auth: {
        type: String,
        required: true,
      },
      p256dh: {
        type: String,
        required: true,
      },
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const PushSubscription = mongoose.model(
  "PushSubscription",
  pushSubscriptionSchema
);
