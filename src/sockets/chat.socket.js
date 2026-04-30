import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { User } from "../models/user.model.js";

let ioInstance = null;

const getSocketRoom = (userId) => `user:${String(userId)}`;

const initSocketIO = (server, allowedOrigins = []) => {
  ioInstance = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Access token missing"));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded._id).select(
        "-password -refreshToken"
      );

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Unauthorized"));
    }
  });

  ioInstance.on("connection", (socket) => {
    socket.join(getSocketRoom(socket.user._id));

    socket.emit("connected", {
      userId: String(socket.user._id),
      connectedAt: new Date().toISOString(),
    });
  });

  return ioInstance;
};

const getIO = () => ioInstance;

const emitSocketChatEvent = (userId, payload) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(getSocketRoom(userId)).emit("chat-message", payload);
};

export { emitSocketChatEvent, getIO, getSocketRoom, initSocketIO };
