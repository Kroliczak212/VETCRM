const notificationsService = require('../services/notifications.service');

class NotificationsController {
  /**
   * Get all notifications for current user
   * GET /api/notifications
   */
  async getAll(req, res, next) {
    try {
      const userId = req.user.id; // From auth middleware
      const result = await notificationsService.getAll(userId, req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get notification by ID
   * GET /api/notifications/:id
   */
  async getById(req, res, next) {
    try {
      const userId = req.user.id;
      const notification = await notificationsService.getById(
        parseInt(req.params.id),
        userId
      );
      res.json(notification);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new notification (admin/system only)
   * POST /api/notifications
   */
  async create(req, res, next) {
    try {
      const notification = await notificationsService.create(req.body);
      res.status(201).json(notification);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark notification as read
   * PATCH /api/notifications/:id/read
   */
  async markAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      const notification = await notificationsService.markAsRead(
        parseInt(req.params.id),
        userId
      );
      res.json(notification);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all notifications as read
   * PATCH /api/notifications/read-all
   */
  async markAllAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await notificationsService.markAllAsRead(userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete notification
   * DELETE /api/notifications/:id
   */
  async delete(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await notificationsService.delete(
        parseInt(req.params.id),
        userId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unread count
   * GET /api/notifications/unread-count
   */
  async getUnreadCount(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await notificationsService.getUnreadCount(userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationsController();
