const { pool } = require('../config/database');
const { NotFoundError } = require('../utils/errors');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * Appointment Reasons Service
 * Manages appointment reason types (Szczepienie, Konsultacja, etc.)
 * Admin can CRUD, all users can read
 */
class AppointmentReasonsService {
  /**
   * Get all appointment reasons with filters
   * @param {Object} query - Filter params
   * @param {boolean} query.isVaccination - Filter by is_vaccination
   * @param {boolean} query.isActive - Filter by is_active (default: true)
   */
  async getAll(query = {}) {
    const { limit, offset, page } = parsePagination(query);
    const { isVaccination, isActive = true } = query;

    let whereClauses = [];
    let params = [];

    if (isActive !== undefined) {
      whereClauses.push('is_active = ?');
      params.push(isActive === 'true' || isActive === true || isActive === 1 ? 1 : 0);
    }

    if (isVaccination !== undefined) {
      whereClauses.push('is_vaccination = ?');
      params.push(isVaccination === 'true' || isVaccination === true || isVaccination === 1 ? 1 : 0);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM appointment_reasons ${whereSQL}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT * FROM appointment_reasons
       ${whereSQL}
       ORDER BY display_order ASC, name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      data: rows,
      pagination: buildPaginationMeta(total, page, limit)
    };
  }

  /**
   * Get appointment reason by ID
   */
  async getById(id) {
    const [[reason]] = await pool.query(
      'SELECT * FROM appointment_reasons WHERE id = ?',
      [id]
    );

    if (!reason) {
      throw new NotFoundError(`Appointment reason with ID ${id} not found`);
    }

    return reason;
  }

  /**
   * Create new appointment reason (admin only)
   */
  async create(data) {
    const { name, description, isVaccination = false, displayOrder = 999 } = data;

    const [result] = await pool.query(
      `INSERT INTO appointment_reasons
       (name, description, is_vaccination, display_order)
       VALUES (?, ?, ?, ?)`,
      [name, description || null, isVaccination, displayOrder]
    );

    return this.getById(result.insertId);
  }

  /**
   * Update appointment reason (admin only)
   */
  async update(id, data) {
    await this.getById(id);

    const { name, description, isVaccination, isActive, displayOrder } = data;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description || null);
    }
    if (isVaccination !== undefined) {
      updates.push('is_vaccination = ?');
      params.push(isVaccination);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive);
    }
    if (displayOrder !== undefined) {
      updates.push('display_order = ?');
      params.push(displayOrder);
    }

    if (updates.length > 0) {
      await pool.query(
        `UPDATE appointment_reasons
         SET ${updates.join(', ')}
         WHERE id = ?`,
        [...params, id]
      );
    }

    return this.getById(id);
  }

  /**
   * Delete appointment reason (admin only)
   * Soft delete - sets is_active = false
   */
  async delete(id) {
    await this.getById(id);

    await pool.query(
      'UPDATE appointment_reasons SET is_active = FALSE WHERE id = ?',
      [id]
    );

    return { message: 'Appointment reason deactivated successfully' };
  }

  /**
   * Hard delete (only for testing/cleanup)
   */
  async hardDelete(id) {
    const [[result]] = await pool.query(
      'DELETE FROM appointment_reasons WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      throw new NotFoundError(`Appointment reason with ID ${id} not found`);
    }

    return { message: 'Appointment reason deleted permanently' };
  }
}

module.exports = new AppointmentReasonsService();
