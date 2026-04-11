import { Notification } from "../models/Notification.js";

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


export {
    getNotifications,
    markAsRead
}