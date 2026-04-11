import { Server } from "../models/Server.js";

export const checkRole = (roles = []) => {
  return async (req, res, next) => {
    try {
      const serverId = req.body.serverId || req.params.serverId;
      const server = await Server.findById(serverId);

      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      const member = server.members.find(
        (m) => m.userId.toString() === req.user.id
      );

      if (!member || !roles.includes(member.role)) {
        return res.status(403).json({ message: "Permission denied" });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
