const { pool } = require('../config/database');
const { NotFoundError } = require('../utils/errors');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * Vaccination Types Service
 * Manages vaccination types per species (Wścieklizna, DHPP, etc.)
 * Admin can CRUD, all users can read
 */
class VaccinationTypesService {
  /**
   * Get all vaccination types with filters
   * @param {Object} query - Filter params
   * @param {string} query.species - Filter by species (pies, kot, etc.) or 'wszystkie'
   * @param {boolean} query.isRequired - Filter by is_required
   * @param {boolean} query.isActive - Filter by is_active (default: true)
   */
  async getAll(query = {}) {
    const { limit, offset, page } = parsePagination(query);
    const { species, isRequired, isActive = true } = query;

    let whereClauses = [];
    let params = [];

    if (isActive !== undefined) {
      whereClauses.push('is_active = ?');
      params.push(isActive === 'true' || isActive === true || isActive === 1 ? 1 : 0);
    }

    if (species) {
      // If species is provided, show vaccines for that species OR 'wszystkie'
      whereClauses.push('(species = ? OR species = ?)');
      params.push(species, 'wszystkie');
    }

    if (isRequired !== undefined) {
      whereClauses.push('is_required = ?');
      params.push(isRequired === 'true' || isRequired === true || isRequired === 1 ? 1 : 0);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM vaccination_types ${whereSQL}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT * FROM vaccination_types
       ${whereSQL}
       ORDER BY species ASC, display_order ASC, name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      data: rows,
      pagination: buildPaginationMeta(total, page, limit)
    };
  }

  /**
   * Get vaccination type by ID
   */
  async getById(id) {
    const [[type]] = await pool.query(
      'SELECT * FROM vaccination_types WHERE id = ?',
      [id]
    );

    if (!type) {
      throw new NotFoundError(`Vaccination type with ID ${id} not found`);
    }

    return type;
  }

  /**
   * Create new vaccination type (admin only)
   */
  async create(data) {
    const {
      name,
      species = 'wszystkie',
      description,
      recommendedIntervalMonths,
      isRequired = false,
      displayOrder = 999
    } = data;

    const [result] = await pool.query(
      `INSERT INTO vaccination_types
       (name, species, description, recommended_interval_months, is_required, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, species, description || null, recommendedIntervalMonths || null, isRequired, displayOrder]
    );

    return this.getById(result.insertId);
  }

  /**
   * Update vaccination type (admin only)
   */
  async update(id, data) {
    await this.getById(id);

    const {
      name,
      species,
      description,
      recommendedIntervalMonths,
      isRequired,
      isActive,
      displayOrder
    } = data;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (species !== undefined) {
      updates.push('species = ?');
      params.push(species);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description || null);
    }
    if (recommendedIntervalMonths !== undefined) {
      updates.push('recommended_interval_months = ?');
      params.push(recommendedIntervalMonths || null);
    }
    if (isRequired !== undefined) {
      updates.push('is_required = ?');
      params.push(isRequired);
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
        `UPDATE vaccination_types
         SET ${updates.join(', ')}
         WHERE id = ?`,
        [...params, id]
      );
    }

    return this.getById(id);
  }

  /**
   * Delete vaccination type (admin only)
   * Soft delete - sets is_active = false
   */
  async delete(id) {
    await this.getById(id);

    await pool.query(
      'UPDATE vaccination_types SET is_active = FALSE WHERE id = ?',
      [id]
    );

    return { message: 'Vaccination type deactivated successfully' };
  }
}

module.exports = new VaccinationTypesService();
