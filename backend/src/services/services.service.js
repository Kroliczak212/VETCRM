const { pool } = require('../config/database');
const { NotFoundError, ConflictError } = require('../utils/errors');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

class ServicesService {
  /**
   * Get all services with pagination and filters
   */
  async getAll(query) {
    const { limit, offset, page } = parsePagination(query);
    const { category, search } = query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      whereClause += ' AND (name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM services ${whereClause}`,
      params
    );
    const totalCount = countResult[0].total;

    const [services] = await pool.query(
      `SELECT * FROM services
       ${whereClause}
       ORDER BY category, name
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      data: services,
      pagination: buildPaginationMeta(totalCount, page, limit)
    };
  }

  /**
   * Get service by ID
   */
  async getById(serviceId) {
    const [services] = await pool.query(
      'SELECT * FROM services WHERE id = ?',
      [serviceId]
    );

    if (services.length === 0) {
      throw new NotFoundError('Service');
    }

    return services[0];
  }

  /**
   * Create new service
   */
  async create(data) {
    const { name, category, price, durationMinutes, description } = data;

    const [existing] = await pool.query(
      'SELECT id FROM services WHERE name = ?',
      [name]
    );

    if (existing.length > 0) {
      throw new ConflictError('Service name already exists');
    }

    const [result] = await pool.query(
      `INSERT INTO services (name, category, price, duration_minutes, description)
       VALUES (?, ?, ?, ?, ?)`,
      [name, category, price, durationMinutes, description || null]
    );

    return this.getById(result.insertId);
  }

  /**
   * Update service
   */
  async update(serviceId, data) {
    const { name, category, price, durationMinutes, description } = data;

    await this.getById(serviceId);

    const updates = [];
    const params = [];

    if (name !== undefined) {
      const [existing] = await pool.query(
        'SELECT id FROM services WHERE name = ? AND id != ?',
        [name, serviceId]
      );
      if (existing.length > 0) {
        throw new ConflictError('Service name already exists');
      }
      updates.push('name = ?');
      params.push(name);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(price);
    }
    if (durationMinutes !== undefined) {
      updates.push('duration_minutes = ?');
      params.push(durationMinutes);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (updates.length > 0) {
      params.push(serviceId);
      await pool.query(
        `UPDATE services SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    return this.getById(serviceId);
  }

  /**
   * Delete service
   */
  async delete(serviceId) {
    await this.getById(serviceId);

    // Note: FK constraints will prevent deletion if service is used in appointments
    await pool.query('DELETE FROM services WHERE id = ?', [serviceId]);

    return { message: 'Service deleted successfully' };
  }

  /**
   * Get all categories
   */
  async getCategories() {
    const [categories] = await pool.query(
      'SELECT DISTINCT category FROM services ORDER BY category'
    );
    return categories.map(c => c.category);
  }
}

module.exports = new ServicesService();
