const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { authenticate } = require('../middleware/auth');
const { validateCreateNotification, validateGetNotificationsQuery } = require('../validators/notifications.validator');

/**
 * All notification routes require authentication
 */
router.use(authenticate());

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for current user
 * @access  Private
 */
router.get('/', validateGetNotificationsQuery, notificationsController.getAll);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', notificationsController.getUnreadCount);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch('/read-all', notificationsController.markAllAsRead);

/**
 * @route   GET /api/notifications/:id
 * @desc    Get notification by ID
 * @access  Private
 */
router.get('/:id', notificationsController.getById);

/**
 * @route   POST /api/notifications
 * @desc    Create notification (admin/system only)
 * @access  Private (Admin)
 */
router.post('/', validateCreateNotification, notificationsController.create);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch('/:id/read', notificationsController.markAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', notificationsController.delete);

module.exports = router;
