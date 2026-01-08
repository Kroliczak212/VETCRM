const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { UnauthorizedError, AccountDeactivatedError, ConflictError, NotFoundError, ValidationError } = require('../utils/errors');
const config = require('../config');
const { validatePasswordStrength, passwordsAreDifferent } = require('../utils/password');
const emailService = require('./email.service');

class AuthService {
  /**
   * Register a new user
   */
  async register(data) {
    const { email, password, firstName, lastName, phone, roleId } = data;

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, passwordHash, firstName, lastName, phone, roleId]
    );

    const user = await this.getUserById(result.insertId);

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

    if (user.is_active === false || user.is_active === 0) {
      throw new AccountDeactivatedError();
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate JWT token (required for change-password endpoint on first login)
    const token = this.generateToken(user);

    // Check if user must change temporary password on first login
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
   * Generate JWT token with unique JTI for blacklist support
   */
  generateToken(user) {
    const jti = crypto.randomUUID(); // Unique token ID for blacklist
    const expiresIn = config.jwt.expiresIn || '24h';

    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role_name,
        jti // JWT ID - used for token revocation
      },
      config.jwt.secret,
      {
        expiresIn
      }
    );
  }

  /**
   * Logout - Revoke token by adding to blacklist
   */
  async logout(token) {
    try {
      // Decode token to get jti and exp
      const decoded = jwt.verify(token, config.jwt.secret);
      const { jti, id: userId, exp } = decoded;

      if (!jti) {
        throw new ValidationError('Token missing JTI - cannot be revoked');
      }

      // Convert exp (unix timestamp in seconds) to MySQL TIMESTAMP
      const expiresAt = new Date(exp * 1000).toISOString().slice(0, 19).replace('T', ' ');

      // Add to blacklist
      await pool.query(
        `INSERT INTO token_blacklist (token_jti, user_id, expires_at, reason)
         VALUES (?, ?, ?, 'logout')
         ON DUPLICATE KEY UPDATE revoked_at = CURRENT_TIMESTAMP`,
        [jti, userId, expiresAt]
      );

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(jti) {
    const [rows] = await pool.query(
      'SELECT id FROM token_blacklist WHERE token_jti = ? AND expires_at > NOW()',
      [jti]
    );
    return rows.length > 0;
  }

  /**
   * Revoke all tokens for a user (e.g., on password change, security breach)
   */
  async revokeAllUserTokens(userId, reason = 'security') {
    // This would require storing all active tokens, which we don't do
    // Instead, we can update password_changed_at and check in middleware
    // OR force tokens to have shorter expiry times
    await pool.query(
      'UPDATE users SET password_changed_at = NOW() WHERE id = ?',
      [userId]
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
   * Request password reset - generates token and sends email
   * Security: Always returns success even if email doesn't exist (prevents user enumeration)
   *
   * @param {string} email - User's email address
   * @param {string} ipAddress - IP address of requester (for audit)
   */
  async requestPasswordReset(email, ipAddress = null) {
    try {
      // Find user by email
      const [users] = await pool.query(
        'SELECT id, email, first_name, last_name FROM users WHERE email = ?',
        [email]
      );

      // If user doesn't exist, silently succeed (security - don't reveal if email exists)
      if (users.length === 0) {
        console.log(`[Security] Password reset requested for non-existent email: ${email}`);
        return { success: true };
      }

      const user = users[0];

      // Cancel all previous unused tokens for this user
      await pool.query(
        `UPDATE password_reset_tokens
         SET cancelled_at = NOW()
         WHERE user_id = ? AND used_at IS NULL AND cancelled_at IS NULL AND expires_at > NOW()`,
        [user.id]
      );

      // Generate secure token (32 bytes = 64 hex characters)
      const token = crypto.randomBytes(32).toString('hex');

      // Token expires in 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address)
         VALUES (?, ?, ?, ?)`,
        [user.id, token, expiresAt, ipAddress]
      );

      // Send password reset email
      await emailService.sendPasswordResetEmail(user, token);

      console.log(`✓ Password reset token generated for user: ${user.email}`);

      return { success: true };
    } catch (error) {
      console.error('Error in requestPasswordReset:', error);
      // Don't throw - always return success for security
      return { success: true };
    }
  }

  /**
   * Verify if reset token is valid (not expired, not used, not cancelled)
   *
   * @param {string} token - Reset token
   * @returns {boolean} - True if token is valid
   */
  async verifyResetToken(token) {
    const [rows] = await pool.query(
      `SELECT id, user_id, expires_at
       FROM password_reset_tokens
       WHERE token = ?
         AND used_at IS NULL
         AND cancelled_at IS NULL
         AND expires_at > NOW()`,
      [token]
    );

    return rows.length > 0;
  }

  /**
   * Reset password using token
   *
   * @param {string} token - Reset token from email
   * @param {string} newPassword - New password
   */
  async resetPassword(token, newPassword) {
    // Verify token exists and is valid
    const [tokens] = await pool.query(
      `SELECT id, user_id, expires_at
       FROM password_reset_tokens
       WHERE token = ?
         AND used_at IS NULL
         AND cancelled_at IS NULL
         AND expires_at > NOW()`,
      [token]
    );

    if (tokens.length === 0) {
      throw new ValidationError('Invalid or expired reset token');
    }

    const resetToken = tokens[0];

    // Get user
    const user = await this.getUserById(resetToken.user_id);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Validate new password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors.join('. '));
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Update user password and clear must_change_password flag
      await connection.query(
        `UPDATE users
         SET password_hash = ?,
             must_change_password = FALSE,
             password_changed_at = NOW()
         WHERE id = ?`,
        [newPasswordHash, user.id]
      );

      // Mark token as used
      await connection.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?',
        [resetToken.id]
      );

      // Revoke all existing JWT tokens by updating password_changed_at
      // (This ensures all old sessions are invalidated)
      // Note: In a more robust system, we'd add all active JTIs to blacklist

      await connection.commit();

      // Send confirmation email
      await emailService.sendPasswordResetConfirmation(user);

      console.log(`✓ Password reset successful for user: ${user.email}`);

      return {
        message: 'Password reset successfully'
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update client profile (self-service)
   * Clients can update: firstName, lastName, phone, address
   * Clients CANNOT update: email, password (use change-password for that)
   */
  async updateProfile(userId, data) {
    const { firstName, lastName, phone, address } = data;

    // Verify user exists and is a client
    const [users] = await pool.query(
      'SELECT id, role_id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      throw new NotFoundError('User');
    }

    if (users[0].role_id !== 4) {
      throw new ValidationError('Only clients can update their profile via this endpoint');
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Update users table
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

      if (userUpdates.length > 0) {
        userParams.push(userId);
        await connection.query(
          `UPDATE users SET ${userUpdates.join(', ')}, updated_at = NOW() WHERE id = ?`,
          userParams
        );
      }

      // Update client_details table (address)
      if (address !== undefined) {
        await connection.query(
          'UPDATE client_details SET address = ? WHERE user_id = ?',
          [address, userId]
        );
      }

      await connection.commit();

      // Return updated profile
      const updatedUser = await this.getProfile(userId);
      return updatedUser;

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
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
