import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true, 
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
lowercase: true,
            trim: true, 
        },
        fullName: {
            type: String,
            required: true,
            trim: true, 
            index: true
        },
        bio: {
            type: String,
            trim: true,
            default: ""
        },
        avatar: {
            type: String, // cloudinary url
        },
        coverImage: {
            type: String, // cloudinary url
        },
        authProvider: {
            type: String,
            trim: true,
            default: "local"
        },
        authProviderId: {
            type: String,
            trim: true,
            default: ""
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true, 'Password is required']
        },
        refreshToken: {
            type: String
        },
        status: {
            type: String,
            enum: ["ONLINE", "OFFLINE"],
            default: "OFFLINE"
        },
        lastSeen: {
            type: Date,
        },
        followers: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        following: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        }
    },
    {
        timestamps: true
    }
)


// ===============================
// 🔐 HASH PASSWORD
// ===============================



userSchema.pre("save", async function () {
    if(!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10)
    
})


// ===============================
// 🔑 PASSWORD CHECK
// ===============================

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}


// ===============================
// 🎟️ ACCESS TOKEN
// ===============================


userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName,
            role: this.role
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}


// ===============================
// 🔁 REFRESH TOKEN
// ===============================


userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)
