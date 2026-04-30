import { DirectMessage } from "../models/DirectMessage.model.js";
import { Notification } from "../models/Notification.model.js";
import { User } from "../models/user.model.js";
import { addChatStream, emitChatEvent } from "../utils/chatEvents.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const serializeContact = (user, currentUser = null) => {
  const currentFollowerIds = new Set(
    (currentUser?.followers || []).map((id) => String(id))
  );
  const currentFollowingIds = new Set(
    (currentUser?.following || []).map((id) => String(id))
  );
  const userId = String(user?._id || user?.id || "");

  return {
    id: userId,
    _id: userId,
    username: user?.username || "",
    fullName: user?.fullName || user?.username || "",
    avatar: user?.avatar || "",
    bio: user?.bio || "",
    isFollower: currentFollowerIds.has(userId),
    isFollowing: currentFollowingIds.has(userId),
  };
};

const serializeMessage = (message, currentUserId) => {
  const senderId = String(message?.senderId?._id || message?.senderId || "");
  const receiverId = String(
    message?.receiverId?._id || message?.receiverId || ""
  );

  return {
    id: String(message?._id || ""),
    _id: String(message?._id || ""),
    text: message?.content || "",
    content: message?.content || "",
    senderId,
    receiverId,
    senderUsername: message?.senderId?.username || "",
    receiverUsername: message?.receiverId?.username || "",
    createdAt: message?.createdAt || null,
    updatedAt: message?.updatedAt || null,
    readAt: message?.readAt || null,
    isOwn: senderId === currentUserId,
  };
};

const getConversationContactId = (message, currentUserId) => {
  const senderId = String(message?.senderId?._id || message?.senderId || "");
  const receiverId = String(
    message?.receiverId?._id || message?.receiverId || ""
  );

  return senderId === currentUserId ? receiverId : senderId;
};

const getConversationContact = (message, currentUserId) => {
  const senderId = String(message?.senderId?._id || message?.senderId || "");
  return senderId === currentUserId ? message?.receiverId : message?.senderId;
};

const getChatConversations = asyncHandler(async (req, res) => {
  const currentUserId = String(req.user._id);

  const [availableUsers, recentMessages] = await Promise.all([
    User.find({
      _id: { $ne: req.user._id },
      role: { $ne: "admin" },
    })
      .select("username fullName avatar bio")
      .sort({ fullName: 1, username: 1 })
      .lean(),
    DirectMessage.find({
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .populate("senderId", "username fullName avatar bio")
      .populate("receiverId", "username fullName avatar bio")
      .lean(),
  ]);

  const contactsMap = new Map();
  const latestMessageByContactId = new Map();
  const unreadCountByContactId = new Map();

  availableUsers.forEach((user) => {
    contactsMap.set(String(user._id), user);
  });

  recentMessages.forEach((message) => {
    const contactId = getConversationContactId(message, currentUserId);
    const contact = getConversationContact(message, currentUserId);

    if (contactId && contact) {
      contactsMap.set(contactId, contact);
    }

    if (!latestMessageByContactId.has(contactId)) {
      latestMessageByContactId.set(contactId, message);
    }

    const isUnread =
      String(message.receiverId?._id || message.receiverId || "") ===
        currentUserId && !message.readAt;

    if (isUnread) {
      unreadCountByContactId.set(
        contactId,
        (unreadCountByContactId.get(contactId) || 0) + 1
      );
    }
  });

  const conversations = Array.from(contactsMap.entries())
    .map(([contactId, contact]) => {
      const latestMessage = latestMessageByContactId.get(contactId) || null;

      return {
        id: `direct:${currentUserId}:${contactId}`,
        contact: serializeContact(contact, req.user),
        lastMessage: latestMessage
          ? serializeMessage(latestMessage, currentUserId)
          : null,
        updatedAt:
          latestMessage?.createdAt ||
          latestMessage?.updatedAt ||
          null,
        unreadCount: unreadCountByContactId.get(contactId) || 0,
      };
    })
    .sort((left, right) => {
      if (left.updatedAt && right.updatedAt) {
        return new Date(right.updatedAt) - new Date(left.updatedAt);
      }

      if (left.updatedAt) return -1;
      if (right.updatedAt) return 1;

      if (left.contact.isFollowing !== right.contact.isFollowing) {
        return left.contact.isFollowing ? -1 : 1;
      }

      return (left.contact.fullName || left.contact.username).localeCompare(
        right.contact.fullName || right.contact.username
      );
    });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        conversations,
      },
      "Conversations fetched successfully"
    )
  );
});

const streamChatEvents = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const userId = String(req.user._id);
  const removeStream = addChatStream(userId, res);

  res.write(
    `event: connected\ndata: ${JSON.stringify({
      userId,
      connectedAt: new Date().toISOString(),
    })}\n\n`
  );

  const heartbeat = setInterval(() => {
    res.write(
      `event: heartbeat\ndata: ${JSON.stringify({
        at: new Date().toISOString(),
      })}\n\n`
    );
  }, 20000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeStream();
    res.end();
  });
};

const getConversationMessages = asyncHandler(async (req, res) => {
  const username = String(req.params.username || "").trim().toLowerCase();
  const currentUserId = String(req.user._id);

  if (!username) {
    throw new ApiError(400, "Username is required");
  }

  const contact = await User.findOne({
    username,
    _id: { $ne: req.user._id },
  }).select("username fullName avatar bio");

  if (!contact) {
    throw new ApiError(404, "Chat user not found");
  }

  const unreadFilter = {
    senderId: contact._id,
    receiverId: req.user._id,
    readAt: null,
  };

  const [messages] = await Promise.all([
    DirectMessage.find({
      $or: [
        {
          senderId: req.user._id,
          receiverId: contact._id,
        },
        {
          senderId: contact._id,
          receiverId: req.user._id,
        },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("senderId", "username fullName avatar bio")
      .populate("receiverId", "username fullName avatar bio"),
    DirectMessage.updateMany(unreadFilter, {
      $set: {
        readAt: new Date(),
      },
    }),
    Notification.updateMany(
      {
        userId: req.user._id,
        type: "MESSAGE",
        link: `/chat?user=${contact.username}`,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      }
    ),
  ]);

  const serializedMessages = messages.map((message) => {
    const isUnreadIncoming =
      String(message.senderId?._id || message.senderId || "") !== currentUserId &&
      String(message.receiverId?._id || message.receiverId || "") ===
        currentUserId &&
      !message.readAt;

    return serializeMessage(
      {
        ...message.toObject(),
        readAt: isUnreadIncoming ? new Date() : message.readAt,
      },
      currentUserId
    );
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        contact: serializeContact(contact, req.user),
        messages: serializedMessages,
      },
      "Conversation fetched successfully"
    )
  );
});

const sendConversationMessage = asyncHandler(async (req, res) => {
  const username = String(req.params.username || "").trim().toLowerCase();
  const content = String(req.body.content || "").trim();
  const currentUserId = String(req.user._id);

  if (!username) {
    throw new ApiError(400, "Username is required");
  }

  if (!content) {
    throw new ApiError(400, "Message content is required");
  }

  const contact = await User.findOne({
    username,
    _id: { $ne: req.user._id },
  }).select("username fullName avatar bio");

  if (!contact) {
    throw new ApiError(404, "Chat user not found");
  }

  const message = await DirectMessage.create({
    senderId: req.user._id,
    receiverId: contact._id,
    content,
  });

  const populatedMessage = await DirectMessage.findById(message._id)
    .populate("senderId", "username fullName avatar bio")
    .populate("receiverId", "username fullName avatar bio");

  await Notification.create({
    userId: contact._id,
    type: "MESSAGE",
    content: `${req.user.fullName || req.user.username} sent you a message`,
    link: `/chat?user=${req.user.username}`,
  });

  const serializedMessage = serializeMessage(populatedMessage, currentUserId);
  const receiverPayload = {
    type: "chat:message",
    contact: serializeContact(req.user, contact),
    message: serializedMessage,
    unread: true,
  };
  const senderPayload = {
    type: "chat:message",
    contact: serializeContact(contact, req.user),
    message: serializedMessage,
    unread: false,
  };

  emitChatEvent(contact._id, "chat-message", receiverPayload);
  emitChatEvent(req.user._id, "chat-message", senderPayload);

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        contact: serializeContact(contact, req.user),
        message: serializedMessage,
      },
      "Message sent successfully"
    )
  );
});

export {
  getChatConversations,
  streamChatEvents,
  getConversationMessages,
  sendConversationMessage,
};
