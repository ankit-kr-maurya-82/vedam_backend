import { User } from "../models/User.js";

const setUserOnline = async(userId) => {
    await User.findByIdAndUpdate(userId, {
        status: "ONLINE",
        lastSeen: null,
    })
}

const setUserOffline = async(userId) => {
    await User.findByIdAndUpdate(userId, {
        status: "OFFLINE",
        lastSeen: new Date(),
    })
}


export {
    setUserOffline,
    setUserOnline
}