import { Notification } from "../models/Notification.model.js";
import { PushSubscription } from "../models/PushSubscription.model.js";
import {
  getPushPublicKey as readPushPublicKey,
  isPushConfigured,
} from "../utils/pushNotifications.js";

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */

const getNotifications = async(req, res, next) => {
    try {
        const notification = await Notification.find(
            {
                userId: req.user.id,
            }
        ).sort({ createdAt: -1 });
        res.json(notification)
    } catch (error) {
        next(error)
    }
}


/**
 * @desc    Mark notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */

const markAsRead = async(req,res, next) => {
    try {
        await Notification.findOneAndUpdate(
            {
                _id: req.params.id,
                userId: req.user.id
            },
            {
                isRead: true
            }
        )

        res.json(
            {
                message: "Notification marked as read"
            }
        )
    } catch (error) {
        next(error)
    }
}

const getPushPublicKey = async (req, res) => {
    if (!isPushConfigured()) {
        return res.status(503).json({
            message: "Push notifications are not configured on the server"
        });
    }

    res.json({
        publicKey: readPushPublicKey()
    });
}

const savePushSubscription = async (req, res, next) => {
    try {
        if (!isPushConfigured()) {
            return res.status(503).json({
                message: "Push notifications are not configured on the server"
            });
        }

        const subscription = req.body?.subscription || req.body;
        const endpoint = String(subscription?.endpoint || "").trim();
        const auth = String(subscription?.keys?.auth || "").trim();
        const p256dh = String(subscription?.keys?.p256dh || "").trim();

        if (!endpoint || !auth || !p256dh) {
            return res.status(400).json({
                message: "A valid push subscription is required"
            });
        }

        await PushSubscription.findOneAndUpdate(
            {
                endpoint
            },
            {
                $set: {
                    userId: req.user._id,
                    endpoint,
                    expirationTime: subscription?.expirationTime ?? null,
                    keys: {
                        auth,
                        p256dh
                    },
                    userAgent: String(req.headers["user-agent"] || ""),
                    isActive: true,
                    lastUsedAt: new Date()
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        res.status(201).json({
            message: "Push subscription saved successfully"
        });
    } catch (error) {
        next(error);
    }
}

const removePushSubscription = async (req, res, next) => {
    try {
        const endpoint = String(
            req.body?.endpoint ||
            req.body?.subscription?.endpoint ||
            ""
        ).trim();

        if (!endpoint) {
            return res.status(400).json({
                message: "Subscription endpoint is required"
            });
        }

        await PushSubscription.deleteOne({
            userId: req.user._id,
            endpoint
        });

        res.json({
            message: "Push subscription removed successfully"
        });
    } catch (error) {
        next(error);
    }
}


export {
    getNotifications,
    markAsRead,
    getPushPublicKey,
    savePushSubscription,
    removePushSubscription
}
