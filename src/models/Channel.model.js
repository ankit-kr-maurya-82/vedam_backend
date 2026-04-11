import mongoose, { Schema } from "mongoose";

const channelSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    serverId: {
      type: Schema.Types.ObjectId,
      ref: "Server",
      required: true,
    },

    type: {
      type: String,
      enum: ["text", "voice"],
      default: "text",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const Channel = mongoose.model("Channel", channelSchema);
