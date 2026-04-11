import mongoose, {Schema} from "mongoose";

const memberSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    role: {
        type: String,
        enum: ["OWNER", "ADMIN", "MOD", "MEMBER"]
    }
})


const serverSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        members: [ memberSchema],
    avatar: String
    },
    {
        timestamps: true
    }
)

export  const server =  mongoose.model("Server", serverSchema);