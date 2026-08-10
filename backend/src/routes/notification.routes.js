import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import * as notificationService from '../services/notification.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

// Require auth for all notification operations
router.use(protect);

// Retrieve all notifications
router.get('/', asyncHandler(async (req, res) => {
    const notifications = await notificationService.getUserNotifications(req.user._id);
    return res.status(200).json(
        new ApiResponse(200, notifications, 'Notifications retrieved successfully')
    );
}));

// Mark all as read
router.patch('/read-all', asyncHandler(async (req, res) => {
    await notificationService.markAllAsRead(req.user._id);
    return res.status(200).json(
        new ApiResponse(200, null, 'All notifications marked as read')
    );
}));

// Mark single as read
router.patch('/:id/read', asyncHandler(async (req, res) => {
    const notification = await notificationService.markAsRead(req.user._id, req.params.id);
    return res.status(200).json(
        new ApiResponse(200, notification, 'Notification marked as read')
    );
}));

export default router;
