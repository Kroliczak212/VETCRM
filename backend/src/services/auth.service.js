const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { UnauthorizedError, ConflictError, NotFoundError, ValidationError } = require('../utils/errors');
const config = require('../config');
const { validatePasswordStrength, passwordsAreDifferent } = require('../utils/password');

class AuthService {
  /**
   * Register a new user
   */
  async register(data) {
    const { email, password, firstName, lastName, phone, roleId } = data;

    // Check if user already exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert user
    const [result] = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, passwordHash, firstName, lastName, phone, roleId]
    );

    // Fetch created user with role info
    const user = await this.getUserById(result.insertId);

    // Generate token
    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token
    };
  }

  /**
   * Login user
   */
  async login(email, password) {
    // Find user with role
    const [rows] = await pool.query(
      `SELECT u.*, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email]
    );

    if (rows.length === 0) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const user = rows[0];

    // Check if account is active
    if (user.is_active === false || user.is_active === 0) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate token (user needs it to call change-password endpoint)
    const token = this.generateToken(user);

    // Check if password change is required
    const requiresPasswordChange = user.must_change_password === 1 || user.must_change_password === true;

    return {
      user: this.sanitizeUser(user),
      token,
      requiresPasswordChange
    };
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId) {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return this.sanitizeUser(user);
  }

  /**
   * Get user by ID with role info
   */
  async getUserById(userId) {
    const [rows] = await pool.query(
      `SELECT u.*, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [userId]
    );
    return rows[0] || null;
  }

  /**
   * Generate JWT token
   */
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role_name
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  /**
   * Change user password
   * Used for first-time password change (temp → permanent)
   * and regular password updates
   */
  async changePassword(userId, oldPassword, newPassword) {
    // Get user
    const user = await this.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isOldPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Validate new password is different
    if (!passwordsAreDifferent(oldPassword, newPassword)) {
      throw new ValidationError('New password must be different from current password');
    }

    // Validate new password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors.join('. '));
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password and clear must_change_password flag
    await pool.query(
      `UPDATE users
       SET password_hash = ?,
           must_change_password = FALSE,
           password_changed_at = NOW()
       WHERE id = ?`,
      [newPasswordHash, userId]
    );

    return {
      message: 'Password changed successfully'
    };
  }

  /**
   * Remove sensitive data from user object
   */
  sanitizeUser(user) {
    const { password_hash, ...sanitized } = user;
    return sanitized;
  }
}

module.exports = new AuthService();
