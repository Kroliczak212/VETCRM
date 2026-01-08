const { pool } = require('../config/database');
const { NotFoundError } = require('../utils/errors');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

class NotificationsService {
  /**
   * Get all notifications for a user with pagination
   * @param {number} userId - User ID
   * @param {Object} query - Query parameters (page, limit, isRead)
   */
  async getAll(userId, query) {
    const { limit, offset, page } = parsePagination(query);
    const { isRead } = query;

    let whereClause = 'WHERE user_id = ?';
    const params = [userId];

    if (isRead !== undefined) {
      whereClause += ' AND is_read = ?';
      params.push(isRead === 'true' || isRead === true ? 1 : 0);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
      params
    );
    const totalCount = countResult[0].total;

    const [notifications] = await pool.query(
      `SELECT id, user_id, title, message, type, is_read, created_at
       FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      data: notifications,
      pagination: buildPaginationMeta(totalCount, page, limit)
    };
  }

  /**
   * Get notification by ID
   */
  async getById(notificationId, userId) {
    const [notifications] = await pool.query(
      'SELECT id, user_id, title, message, type, is_read, created_at FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (notifications.length === 0) {
      throw new NotFoundError('Notification');
    }

    return notifications[0];
  }

  /**
   * Create new notification
   */
  async create(data) {
    const { userId, title, message, type } = data;

    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, is_read)
       VALUES (?, ?, ?, ?, 0)`,
      [userId, title, message, type]
    );

    return this.getById(result.insertId, userId);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    await this.getById(notificationId, userId);

    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    return this.getById(notificationId, userId);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    const [result] = await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    return {
      message: 'All notifications marked as read',
      updatedCount: result.affectedRows
    };
  }

  /**
   * Delete notification
   */
  async delete(notificationId, userId) {
    await this.getById(notificationId, userId);

    await pool.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    return { message: 'Notification deleted successfully' };
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId) {
    const [result] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    return { unreadCount: result[0].count };
  }
}

module.exports = new NotificationsService();
