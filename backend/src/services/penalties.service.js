const { pool } = require('../config/database');
const { NotFoundError } = require('../utils/errors');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

class PenaltiesService {
  /**
   * Get all penalties with pagination and filters
   * @param {Object} query - Query parameters (page, limit, clientUserId)
   */
  async getAll(query) {
    const { limit, offset, page } = parsePagination(query);
    const { clientUserId } = query;

    let whereClause = '';
    const params = [];

    if (clientUserId) {
      whereClause = 'WHERE p.client_user_id = ?';
      params.push(clientUserId);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM penalties p ${whereClause}`,
      params
    );
    const totalCount = countResult[0].total;

    const [penalties] = await pool.query(
      `SELECT p.*,
              u.first_name as client_first_name, u.last_name as client_last_name,
              u.email as client_email, u.phone as client_phone
       FROM penalties p
       LEFT JOIN users u ON p.client_user_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      data: penalties,
      pagination: buildPaginationMeta(totalCount, page, limit)
    };
  }

  /**
   * Get penalty by ID
   */
  async getById(penaltyId) {
    const [penalties] = await pool.query(
      `SELECT p.*,
              u.first_name as client_first_name, u.last_name as client_last_name,
              u.email as client_email, u.phone as client_phone,
              a.scheduled_at as appointment_scheduled_at
       FROM penalties p
       LEFT JOIN users u ON p.client_user_id = u.id
       LEFT JOIN appointments a ON p.appointment_id = a.id
       WHERE p.id = ?`,
      [penaltyId]
    );

    if (penalties.length === 0) {
      throw new NotFoundError('Penalty');
    }

    return penalties[0];
  }

  /**
   * Get penalties by client user ID
   */
  async getByClientId(clientUserId) {
    const [penalties] = await pool.query(
      `SELECT p.*,
              a.scheduled_at as appointment_scheduled_at
       FROM penalties p
       LEFT JOIN appointments a ON p.appointment_id = a.id
       WHERE p.client_user_id = ?
       ORDER BY p.created_at DESC`,
      [clientUserId]
    );

    return penalties;
  }

  /**
   * Create new penalty
   */
  async create(data) {
    const { clientUserId, appointmentId, amount, reason } = data;

    const [result] = await pool.query(
      `INSERT INTO penalties (client_user_id, appointment_id, amount, reason)
       VALUES (?, ?, ?, ?)`,
      [clientUserId, appointmentId || null, amount, reason]
    );

    return this.getById(result.insertId);
  }

  /**
   * Delete penalty
   */
  async delete(penaltyId) {
    await this.getById(penaltyId);

    await pool.query('DELETE FROM penalties WHERE id = ?', [penaltyId]);

    return { message: 'Penalty deleted successfully' };
  }

  /**
   * Get penalty statistics
   */
  async getStatistics() {
    const [stats] = await pool.query(`
      SELECT
        SUM(amount) as total_amount,
        COUNT(*) as total_count,
        AVG(amount) as average_amount
      FROM penalties
    `);

    return stats[0];
  }

  /**
   * Auto-create penalty for late cancellation
   * Called from appointments.service when status changes to 'cancelled_late'
   */
  async createLateCancellationPenalty(appointmentId, clientUserId, scheduledAt) {
    const timeDiff = new Date(scheduledAt) - new Date();
    const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);

    // Only create penalty if cancelled less than 24 hours before appointment
    if (hoursUntilAppointment < 24 && hoursUntilAppointment >= 0) {
      const penaltyAmount = 50.00; // Fixed penalty amount

      return await this.create({
        clientUserId,
        appointmentId,
        amount: penaltyAmount,
        reason: `Late cancellation (less than 24 hours before appointment)`
      });
    }

    return null;
  }
}

module.exports = new PenaltiesService();
