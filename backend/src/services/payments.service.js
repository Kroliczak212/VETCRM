const { pool } = require('../config/database');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

class PaymentsService {
  /**
   * Get all payments with pagination and filters
   * @param {Object} query - Query parameters (page, limit, status, appointmentId)
   */
  async getAll(query) {
    const { limit, offset, page } = parsePagination(query);
    const { status, appointmentId } = query;

    // Build WHERE clause
    let whereClause = '';
    const params = [];

    if (status) {
      whereClause = 'WHERE p.status = ?';
      params.push(status);
    }

    if (appointmentId) {
      whereClause += whereClause ? ' AND p.appointment_id = ?' : 'WHERE p.appointment_id = ?';
      params.push(appointmentId);
    }

    // Get total count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM payments p ${whereClause}`,
      params
    );
    const totalCount = countResult[0].total;

    // Get paginated payments with appointment details
    const [payments] = await pool.query(
      `SELECT p.*,
              a.scheduled_at, a.status as appointment_status,
              u.first_name as client_first_name, u.last_name as client_last_name
       FROM payments p
       LEFT JOIN appointments a ON p.appointment_id = a.id
       LEFT JOIN users u ON a.client_user_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      data: payments,
      pagination: buildPaginationMeta(totalCount, page, limit)
    };
  }

  /**
   * Get payment by ID
   */
  async getById(paymentId) {
    const [payments] = await pool.query(
      `SELECT p.*,
              a.scheduled_at, a.status as appointment_status,
              u.first_name as client_first_name, u.last_name as client_last_name
       FROM payments p
       LEFT JOIN appointments a ON p.appointment_id = a.id
       LEFT JOIN users u ON a.client_user_id = u.id
       WHERE p.id = ?`,
      [paymentId]
    );

    if (payments.length === 0) {
      throw new NotFoundError('Payment');
    }

    return payments[0];
  }

  /**
   * Get payment by appointment ID
   */
  async getByAppointmentId(appointmentId) {
    const [payments] = await pool.query(
      `SELECT p.*,
              a.scheduled_at, a.status as appointment_status
       FROM payments p
       LEFT JOIN appointments a ON p.appointment_id = a.id
       WHERE p.appointment_id = ?`,
      [appointmentId]
    );

    if (payments.length === 0) {
      throw new NotFoundError('Payment for this appointment');
    }

    return payments[0];
  }

  /**
   * Create new payment (auto-created with appointment)
   */
  async create(data) {
    const { appointmentId, amountDue, paymentMethod = 'cash' } = data;

    const [result] = await pool.query(
      `INSERT INTO payments (appointment_id, amount_due, amount_paid, status, payment_method)
       VALUES (?, ?, 0, 'unpaid', ?)`,
      [appointmentId, amountDue, paymentMethod]
    );

    return this.getById(result.insertId);
  }

  /**
   * Update payment (record payment)
   */
  async update(paymentId, data) {
    const { amountPaid, paymentMethod, paymentDate } = data;

    // Get current payment
    const payment = await this.getById(paymentId);

    // Calculate new total paid
    const newTotalPaid = (parseFloat(payment.amount_paid) || 0) + (parseFloat(amountPaid) || 0);
    const amountDue = parseFloat(payment.amount_due);

    // Determine new status
    let newStatus;
    if (newTotalPaid >= amountDue) {
      newStatus = 'paid';
    } else if (newTotalPaid > 0) {
      newStatus = 'partially_paid';
    } else {
      newStatus = 'unpaid';
    }

    // Build update query
    const updates = [];
    const params = [];

    if (amountPaid !== undefined) {
      updates.push('amount_paid = amount_paid + ?');
      params.push(amountPaid);
    }

    if (paymentMethod !== undefined) {
      updates.push('payment_method = ?');
      params.push(paymentMethod);
    }

    if (paymentDate !== undefined) {
      updates.push('payment_date = ?');
      params.push(paymentDate);
    } else if (newStatus === 'paid') {
      updates.push('payment_date = NOW()');
    }

    updates.push('status = ?');
    params.push(newStatus);

    if (updates.length > 0) {
      params.push(paymentId);
      await pool.query(
        `UPDATE payments SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    return this.getById(paymentId);
  }

  /**
   * Delete payment
   */
  async delete(paymentId) {
    // Verify payment exists
    await this.getById(paymentId);

    await pool.query('DELETE FROM payments WHERE id = ?', [paymentId]);

    return { message: 'Payment deleted successfully' };
  }

  /**
   * Get payment statistics
   */
  async getStatistics() {
    const [stats] = await pool.query(`
      SELECT
        SUM(CASE WHEN status = 'paid' THEN amount_due ELSE 0 END) as total_paid,
        SUM(CASE WHEN status = 'unpaid' THEN amount_due ELSE 0 END) as total_unpaid,
        SUM(CASE WHEN status = 'partially_paid' THEN (amount_due - amount_paid) ELSE 0 END) as total_partial,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as count_paid,
        COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as count_unpaid,
        COUNT(CASE WHEN status = 'partially_paid' THEN 1 END) as count_partial
      FROM payments
    `);

    return stats[0];
  }
}

module.exports = new PaymentsService();
