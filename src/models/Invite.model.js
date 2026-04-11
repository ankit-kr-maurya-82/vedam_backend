import mongoose, { Schema } from "mongoose"

const inviteSchema = new Schema(
    {
        serverId: {
            type: Schema.Types.ObjectId,
            ref: "Server",
            required: true
        },
        code: {
            type: String,
            unique: true,
            required: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        expiresAt: {
            type: Date
        },
        maxUses: {
            type: Number,
            default: 0
        },
        uses: {
            type: Number,
            default: 0
        },
    },
    {
        timestamps: true
    }
)


export const Invite = mongoose.model("Invite", inviteSchema);