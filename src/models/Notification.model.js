import mongoose, { Schema } from 'mongoose';

const notificationSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        type: {
            type: String,
            enum: ["MESSAGE", "MENTION", "INVITE"],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        link: {
            type: String
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
)

export const Notification = mongoose.model("Notification", notificationSchema)