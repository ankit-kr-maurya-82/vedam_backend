import mongoose, { Schema } from "mongoose";

const reactionSchema  = new Schema(
  {
    emoji: String,
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
    }
    ]
  },
  {
    _id: false
  }
)

const messageSchema = new Schema(
  {
    channelId: {
      type: Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },

    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },
    reactions: [reactionSchema]
  },
  {
    timestamps: true,
  }
);

export const Message = mongoose.model("Message", messageSchema);
