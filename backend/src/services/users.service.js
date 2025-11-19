const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/errors');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { generateTemporaryPassword } = require('../utils/password');

class UsersService {
  /**
   * Get all users with pagination and filters
   * @param {Object} query - Query parameters (page, limit, roleId, role, isActive)
   */
  async getAll(query) {
    const { limit, offset, page } = parsePagination(query);
    const { roleId, role, isActive } = query;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (roleId) {
      whereClause += ' AND u.role_id = ?';
      params.push(roleId);
    } else if (role) {
      // Map role name to role_id
      whereClause += ' AND r.name = ?';
      params.push(role);
    }

    // Filter by is_active (default: only active users)
    if (isActive !== undefined) {
      whereClause += ' AND u.is_active = ?';
      params.push(isActive === 'true' || isActive === true ? 1 : 0);
    } else {
      // Default: show only active users
      whereClause += ' AND u.is_active = TRUE';
    }

    // Get total count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ${whereClause}`,
      params
    );
    const totalCount = countResult[0].total;

    // Get paginated users
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
              u.role_id, r.name as role_name, u.is_active, u.created_at, u.updated_at
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      data: users,
      pagination: buildPaginationMeta(totalCount, page, limit)
    };
  }

  /**
   * Get user by ID with role-specific details
   */
  async getById(userId) {
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
              u.role_id, r.name as role_name, u.is_active, u.created_at, u.updated_at
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      throw new NotFoundError('User');
    }

    const user = users[0];

    // Fetch role-specific details
    if (user.role_name === 'doctor') {
      const [details] = await pool.query(
        'SELECT * FROM doctor_details WHERE user_id = ?',
        [userId]
      );
      user.details = details[0] || null;
    } else if (user.role_name === 'receptionist') {
      const [details] = await pool.query(
        'SELECT * FROM receptionist_details WHERE user_id = ?',
        [userId]
      );
      user.details = details[0] || null;
    } else if (user.role_name === 'client') {
      const [details] = await pool.query(
        'SELECT * FROM client_details WHERE user_id = ?',
        [userId]
      );
      user.details = details[0] || null;
    }

    return user;
  }

  /**
   * Create new user (staff only: admin, receptionist, doctor)
   * Clients are created via /api/clients endpoint
   */
  async create(data) {
    const { email, password, firstName, lastName, phone, roleId, details } = data;

    // Check if email already exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      throw new ConflictError('Email already exists');
    }

    // Validate roleId (only staff roles: 1=admin, 2=receptionist, 3=doctor)
    // Role 4=client should use /api/clients endpoint
    if (![1, 2, 3].includes(roleId)) {
      throw new ConflictError('Invalid role. Use /api/clients to create client accounts');
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Generate temporary password if not provided
      // Password format: email + phone (without +48 prefix)
      const temporaryPassword = password || generateTemporaryPassword(email, phone || '');
      const mustChangePassword = !password; // Force change if auto-generated

      // Hash password
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);

      // Insert user
      const [result] = await connection.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, must_change_password)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [email, passwordHash, firstName, lastName, phone, roleId, mustChangePassword]
      );

      const userId = result.insertId;

      // Insert role-specific details
      if (roleId === 3 && details) {
        // Doctor details
        await connection.query(
          `INSERT INTO doctor_details (user_id, specialization, license_number, experience_years)
           VALUES (?, ?, ?, ?)`,
          [userId, details.specialization, details.licenseNumber, details.experienceYears || 0]
        );
      } else if (roleId === 2 && details) {
        // Receptionist details
        await connection.query(
          `INSERT INTO receptionist_details (user_id, start_date)
           VALUES (?, ?)`,
          [userId, details.startDate || new Date()]
        );
      }

      await connection.commit();

      // Return user data with temporary password (only shown once)
      const user = await this.getById(userId);

      // Include temporary password ONLY if it was auto-generated
      // This allows admin/receptionist to see it and share with user
      if (mustChangePassword) {
        user.temporaryPassword = temporaryPassword;
      }

      return user;

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Update user
   */
  async update(userId, data) {
    const { firstName, lastName, phone, password, details } = data;

    // Check if user exists
    const user = await this.getById(userId);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Build update query
      const updates = [];
      const params = [];

      if (firstName !== undefined) {
        updates.push('first_name = ?');
        params.push(firstName);
      }
      if (lastName !== undefined) {
        updates.push('last_name = ?');
        params.push(lastName);
      }
      if (phone !== undefined) {
        updates.push('phone = ?');
        params.push(phone);
      }
      if (password) {
        updates.push('password_hash = ?');
        params.push(await bcrypt.hash(password, 12));
      }

      if (updates.length > 0) {
        params.push(userId);
        await connection.query(
          `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
          params
        );
      }

      // Update role-specific details
      if (details && user.role_name === 'doctor') {
        const detailUpdates = [];
        const detailParams = [];

        if (details.specialization !== undefined) {
          detailUpdates.push('specialization = ?');
          detailParams.push(details.specialization);
        }
        if (details.licenseNumber !== undefined) {
          detailUpdates.push('license_number = ?');
          detailParams.push(details.licenseNumber);
        }
        if (details.experienceYears !== undefined) {
          detailUpdates.push('experience_years = ?');
          detailParams.push(details.experienceYears);
        }

        if (detailUpdates.length > 0) {
          detailParams.push(userId);
          await connection.query(
            `UPDATE doctor_details SET ${detailUpdates.join(', ')} WHERE user_id = ?`,
            detailParams
          );
        }
      }

      await connection.commit();
      return this.getById(userId);

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Update user's active status
   * ADMIN ONLY - activates/deactivates user account
   * When doctor is deactivated, they won't appear in available doctors list
   * and getAvailableSlots will return empty array
   */
  async updateIsActive(userId, isActive) {
    // Check if user exists
    const user = await this.getById(userId);

    // Only doctors and receptionists can be deactivated (not admins or clients)
    if (user.role_name === 'admin') {
      throw new ValidationError('Cannot deactivate admin accounts');
    }

    await pool.query(
      'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [isActive ? 1 : 0, userId]
    );

    // If deactivating a doctor, also deactivate their working hours
    if (!isActive && user.role_name === 'doctor') {
      await pool.query(
        'UPDATE working_hours SET is_active = FALSE WHERE doctor_user_id = ?',
        [userId]
      );

      // Also update pending schedules to rejected
      await pool.query(
        `UPDATE schedules
         SET status = 'rejected',
             notes = CONCAT(COALESCE(notes, ''), '\n[Auto-rejected: Doctor account deactivated]')
         WHERE doctor_user_id = ? AND status = 'pending'`,
        [userId]
      );
    }

    return this.getById(userId);
  }

  /**
   * Delete user (soft delete - can be implemented later)
   */
  async delete(userId) {
    // Check if user exists
    await this.getById(userId);

    // Note: In production, check if user has related records (appointments, etc.)
    // and either prevent deletion or cascade appropriately

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Delete role-specific details first (FK constraints)
      await connection.query('DELETE FROM doctor_details WHERE user_id = ?', [userId]);
      await connection.query('DELETE FROM receptionist_details WHERE user_id = ?', [userId]);

      // Delete user
      await connection.query('DELETE FROM users WHERE id = ?', [userId]);

      await connection.commit();
      return { message: 'User deleted successfully' };

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all active doctors (available for all authenticated users)
   */
  async getDoctors() {
    const [doctors] = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
              u.role_id, r.name as role_name, u.created_at
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'doctor' AND u.is_active = TRUE
       ORDER BY u.last_name, u.first_name`
    );

    // Fetch doctor details for each doctor
    for (const doctor of doctors) {
      const [details] = await pool.query(
        'SELECT specialization, license_number, experience_years FROM doctor_details WHERE user_id = ?',
        [doctor.id]
      );
      doctor.details = details[0] || null;
    }

    return doctors;
  }

  /**
   * Get all roles
   */
  async getRoles() {
    const [roles] = await pool.query('SELECT * FROM roles ORDER BY id');
    return roles;
  }
}

module.exports = new UsersService();
