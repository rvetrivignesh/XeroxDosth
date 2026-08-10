import Notification from '../models/Notification.js';

/**
 * Creates an in-app notification in database and transmits it via socket.io.
 */
export const createNotification = async (io, { recipient, sender, order, type, title, message }) => {
    try {
        const notification = await Notification.create({
            recipient,
            sender: sender || null,
            order,
            type,
            title,
            message,
            isRead: false
        });

        if (io) {
            const recipientRoom = recipient.toString();
            console.log(`Emitting notification to socket room: ${recipientRoom}`);
            io.to(recipientRoom).emit('notification', notification);
        }

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

/**
 * Retrieves unread notification count and all notifications for a user.
 */
export const getUserNotifications = async (userId) => {
    const notifications = await Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .limit(50);
    return notifications;
};

/**
 * Marks a notification as read.
 */
export const markAsRead = async (userId, notificationId) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true },
        { new: true }
    );
    return notification;
};

/**
 * Marks all notifications as read.
 */
export const markAllAsRead = async (userId) => {
    await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true }
    );
};
