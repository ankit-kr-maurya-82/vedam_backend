import { Server } from "../models/Server.js";

/**
 * @desc    Create a new server (community)
 * @route   POST /api/servers
 * @access  Private
 */
export const createServer = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Server name is required" });
    }

    const server = await Server.create({
      name,
      owner: req.user.id,
      members: [
        {
          userId: req.user.id,
          role: "OWNER",
        },
      ],
    });

    res.status(201).json(server);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all servers of logged-in user
 * @route   GET /api/servers
 * @access  Private
 */
export const getMyServers = async (req, res, next) => {
  try {
    const servers = await Server.find({
      "members.userId": req.user.id,
    }).sort({ createdAt: -1 });

    res.json(servers);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single server details
 * @route   GET /api/servers/:id
 * @access  Private (member only)
 */
export const getServerById = async (req, res, next) => {
  try {
    const server = await Server.findById(req.params.id).populate(
      "members.userId",
      "username avatar"
    );

    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    const isMember = server.members.some(
      (m) => m.userId._id.toString() === req.user.id
    );

    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(server);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Join a server
 * @route   POST /api/servers/:id/join
 * @access  Private
 */
export const joinServer = async (req, res, next) => {
  try {
    const server = await Server.findById(req.params.id);

    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    const exists = server.members.find(
      (m) => m.userId.toString() === req.user.id
    );

    if (exists) {
      return res.status(400).json({ message: "Already a member" });
    }

    server.members.push({
      userId: req.user.id,
      role: "MEMBER",
    });

    await server.save();
    res.json({ message: "Joined server successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Leave a server
 * @route   POST /api/servers/:id/leave
 * @access  Private
 */
export const leaveServer = async (req, res, next) => {
  try {
    const server = await Server.findById(req.params.id);

    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    server.members = server.members.filter(
      (m) => m.userId.toString() !== req.user.id
    );

    await server.save();
    res.json({ message: "Left server successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update server name
 * @route   PUT /api/servers/:id
 * @access  Private (OWNER only)
 */
export const updateServer = async (req, res, next) => {
  try {
    const { name } = req.body;
    const server = await Server.findById(req.params.id);

    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    if (server.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only owner can update server" });
    }

    server.name = name || server.name;
    await server.save();

    res.json(server);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update member role
 * @route   PUT /api/servers/:serverId/role
 * @access  Private (OWNER / ADMIN)
 */
export const updateMemberRole = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const server = await Server.findById(req.params.serverId);

    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    const requester = server.members.find(
      (m) => m.userId.toString() === req.user.id
    );

    if (!["OWNER", "ADMIN"].includes(requester?.role)) {
      return res.status(403).json({ message: "Permission denied" });
    }

    const member = server.members.find(
      (m) => m.userId.toString() === userId
    );

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    member.role = role;
    await server.save();

    res.json({ message: "Role updated successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete server
 * @route   DELETE /api/servers/:id
 * @access  Private (OWNER only)
 */
export const deleteServer = async (req, res, next) => {
  try {
    const server = await Server.findById(req.params.id);

    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    if (server.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only owner can delete server" });
    }

    await server.deleteOne();
    res.json({ message: "Server deleted successfully" });
  } catch (error) {
    next(error);
  }
};
