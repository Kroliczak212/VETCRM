const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const { NotFoundError, ConflictError } = require('../utils/errors');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { generateTemporaryPassword } = require('../utils/password');
const emailService = require('./email.service');

class ClientsService {
  /**
   * Get all clients with pagination and search
   * @param {Object} query - Query parameters (page, limit, search)
   */
  async getAll(query) {
    const { limit, offset, page } = parsePagination(query);
    const { search } = query;

    let whereClause = 'WHERE u.role_id = 4';
    const params = [];

    if (search) {
      whereClause += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );
    const totalCount = countResult[0].total;

    // Get paginated clients with their details and pet count
    const [clients] = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
              cd.address, cd.notes,
              u.created_at, u.updated_at,
              COUNT(p.id) as pets_count
       FROM users u
       LEFT JOIN client_details cd ON u.id = cd.user_id
       LEFT JOIN pets p ON u.id = p.owner_user_id
       ${whereClause}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      data: clients,
      pagination: buildPaginationMeta(totalCount, page, limit)
    };
  }

  /**
   * Get client by ID with pets
   */
  async getById(clientId) {
    const [clients] = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
              cd.address, cd.notes,
              u.created_at, u.updated_at
       FROM users u
       LEFT JOIN client_details cd ON u.id = cd.user_id
       WHERE u.id = ? AND u.role_id = 4`,
      [clientId]
    );

    if (clients.length === 0) {
      throw new NotFoundError('Client');
    }

    const client = clients[0];

    const [pets] = await pool.query(
      `SELECT id, name, species, breed, sex, date_of_birth, notes, created_at
       FROM pets
       WHERE owner_user_id = ?
       ORDER BY created_at DESC`,
      [clientId]
    );

    client.pets = pets;

    return client;
  }

  /**
   * Create new client (by receptionist or admin)
   */
  async create(data) {
    const { email, password, firstName, lastName, phone, address, notes } = data;

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      throw new ConflictError('Email already exists');
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Generate temporary password if not provided
      // Password format: email + phone (without +48 prefix)
      const temporaryPassword = password || generateTemporaryPassword(email, phone);
      const mustChangePassword = !password; // Force change if auto-generated

      const passwordHash = await bcrypt.hash(temporaryPassword, 12);

      const [result] = await connection.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, must_change_password)
         VALUES (?, ?, ?, ?, ?, 4, ?)`,
        [email, passwordHash, firstName, lastName, phone, mustChangePassword]
      );

      const clientId = result.insertId;

      await connection.query(
        `INSERT INTO client_details (user_id, address, notes)
         VALUES (?, ?, ?)`,
        [clientId, address || null, notes || null]
      );

      await connection.commit();

      // Return client data with temporary password (only shown once)
      const client = await this.getById(clientId);

      // Include temporary password ONLY if it was auto-generated
      // This allows receptionist to see it and share with client
      if (mustChangePassword) {
        client.temporaryPassword = temporaryPassword;

        try {
          await emailService.sendWelcomeEmail(client, temporaryPassword);
          console.log(`✓ Welcome email sent to new client: ${client.email}`);
        } catch (emailError) {
          // Log error but don't fail client creation
          console.error(`✗ Failed to send welcome email to ${client.email}:`, emailError.message);
        }
      }

      return client;

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Update client
   */
  async update(clientId, data) {
    const { firstName, lastName, phone, address, notes, password } = data;

    await this.getById(clientId);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const userUpdates = [];
      const userParams = [];

      if (firstName !== undefined) {
        userUpdates.push('first_name = ?');
        userParams.push(firstName);
      }
      if (lastName !== undefined) {
        userUpdates.push('last_name = ?');
        userParams.push(lastName);
      }
      if (phone !== undefined) {
        userUpdates.push('phone = ?');
        userParams.push(phone);
      }
      if (password) {
        userUpdates.push('password_hash = ?');
        userParams.push(await bcrypt.hash(password, 12));
      }

      if (userUpdates.length > 0) {
        userParams.push(clientId);
        await connection.query(
          `UPDATE users SET ${userUpdates.join(', ')}, updated_at = NOW() WHERE id = ?`,
          userParams
        );
      }

      const detailUpdates = [];
      const detailParams = [];

      if (address !== undefined) {
        detailUpdates.push('address = ?');
        detailParams.push(address);
      }
      if (notes !== undefined) {
        detailUpdates.push('notes = ?');
        detailParams.push(notes);
      }

      if (detailUpdates.length > 0) {
        detailParams.push(clientId);
        await connection.query(
          `UPDATE client_details SET ${detailUpdates.join(', ')} WHERE user_id = ?`,
          detailParams
        );
      }

      await connection.commit();
      return this.getById(clientId);

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete client
   */
  async delete(clientId) {
    await this.getById(clientId);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Note: Check for related records (pets, appointments) before deletion
      // For now, FK constraints will prevent deletion if pets exist

      await connection.query('DELETE FROM client_details WHERE user_id = ?', [clientId]);

      await connection.query('DELETE FROM users WHERE id = ?', [clientId]);

      await connection.commit();
      return { message: 'Client deleted successfully' };

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Get client's pets
   */
  async getPets(clientId) {
    await this.getById(clientId);

    const [pets] = await pool.query(
      `SELECT id, name, species, breed, sex, date_of_birth, notes, created_at, updated_at
       FROM pets
       WHERE owner_user_id = ?
       ORDER BY name`,
      [clientId]
    );

    return pets;
  }
}

module.exports = new ClientsService();
