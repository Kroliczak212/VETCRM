/**
 * Generates a temporary password based on email and phone number
 *
 * @param {string} email - User's email address
 * @param {string} phone - User's phone number (will remove +48 prefix if present)
 * @returns {string} Temporary password (email + phone without +48)
 *
 * Example:
 * - Email: jan.kowalski@example.com
 * - Phone: +48123456789
 * - Output: jan.kowalski@example.com123456789
 */
function generateTemporaryPassword(email, phone) {
  // Remove +48 prefix from phone if present
  const cleanPhone = phone.replace(/^\+48/, '').replace(/\s/g, '');

  // Combine email and phone
  return email + cleanPhone;
}

/**
 * Validates password strength according to system requirements
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 *
 * @param {string} password - Password to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
function validatePasswordStrength(password) {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common weak passwords
  const weakPasswords = ['password', 'password123', '12345678', 'qwerty123'];
  if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
    errors.push('Password is too common and easily guessable');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Checks if password meets minimum requirements for temporary password change
 * (Used to ensure temp password is different from new password)
 *
 * @param {string} oldPassword - Current password
 * @param {string} newPassword - New password
 * @returns {boolean} True if passwords are different
 */
function passwordsAreDifferent(oldPassword, newPassword) {
  return oldPassword !== newPassword;
}

module.exports = {
  generateTemporaryPassword,
  validatePasswordStrength,
  passwordsAreDifferent
};
