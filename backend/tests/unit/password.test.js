/**
 * Unit Tests for Password Utilities
 *
 * Tests password validation and generation functions.
 * Convention: AAA (Arrange-Act-Assert)
 *
 * @file tests/unit/password.test.js
 */

const {
  validatePasswordStrength,
  passwordsAreDifferent,
  generateTemporaryPassword
} = require('../../src/utils/password');

describe('Password Utilities', () => {
  describe('validatePasswordStrength()', () => {
    test('should accept strong password meeting all requirements', () => {
      // Arrange
      const password = 'SecurePass123!';

      // Act
      const result = validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject password shorter than 8 characters', () => {
      // Arrange
      const password = 'Abc1!';

      // Act
      const result = validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    test('should reject password without uppercase letter', () => {
      // Arrange
      const password = 'securepass123!';

      // Act
      const result = validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    test('should reject password without lowercase letter', () => {
      // Arrange
      const password = 'SECUREPASS123!';

      // Act
      const result = validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    test('should reject password without number', () => {
      // Arrange
      const password = 'SecurePassword!';

      // Act
      const result = validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    test('should reject password without special character', () => {
      // Arrange
      const password = 'SecurePass123';

      // Act
      const result = validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    test('should reject common weak passwords like "password123"', () => {
      // Arrange
      const password = 'Password123!';

      // Act
      const result = validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common and easily guessable');
    });

    test('should reject password containing "qwerty"', () => {
      // Arrange
      const password = 'Qwerty123!@#';

      // Act
      const result = validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common and easily guessable');
    });

    test('should return multiple errors for very weak password', () => {
      // Arrange
      const password = 'abc';

      // Act
      const result = validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    test('should handle empty string password', () => {
      // Arrange
      const password = '';

      // Act
      const result = validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    test('should accept password with various special characters', () => {
      // Arrange
      const passwords = [
        'SecurePass1!',
        'SecurePass1@',
        'SecurePass1#',
        'SecurePass1$',
        'SecurePass1%',
        'SecurePass1^',
        'SecurePass1&',
        'SecurePass1*'
      ];

      // Act & Assert
      passwords.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('passwordsAreDifferent()', () => {
    test('should return true when passwords are different', () => {
      // Arrange
      const oldPassword = 'OldPassword123!';
      const newPassword = 'NewPassword456@';

      // Act
      const result = passwordsAreDifferent(oldPassword, newPassword);

      // Assert
      expect(result).toBe(true);
    });

    test('should return false when passwords are identical', () => {
      // Arrange
      const oldPassword = 'SamePassword123!';
      const newPassword = 'SamePassword123!';

      // Act
      const result = passwordsAreDifferent(oldPassword, newPassword);

      // Assert
      expect(result).toBe(false);
    });

    test('should be case-sensitive', () => {
      // Arrange
      const oldPassword = 'Password123!';
      const newPassword = 'password123!';

      // Act
      const result = passwordsAreDifferent(oldPassword, newPassword);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('generateTemporaryPassword()', () => {
    test('should combine email and phone number', () => {
      // Arrange
      const email = 'jan.kowalski@example.com';
      const phone = '123456789';

      // Act
      const result = generateTemporaryPassword(email, phone);

      // Assert
      expect(result).toBe('jan.kowalski@example.com123456789');
    });

    test('should remove +48 prefix from phone number', () => {
      // Arrange
      const email = 'jan.kowalski@example.com';
      const phone = '+48123456789';

      // Act
      const result = generateTemporaryPassword(email, phone);

      // Assert
      expect(result).toBe('jan.kowalski@example.com123456789');
    });

    test('should remove spaces from phone number', () => {
      // Arrange
      const email = 'test@example.com';
      const phone = '123 456 789';

      // Act
      const result = generateTemporaryPassword(email, phone);

      // Assert
      expect(result).toBe('test@example.com123456789');
    });

    test('should handle phone with +48 and spaces', () => {
      // Arrange
      const email = 'user@domain.pl';
      const phone = '+48 123 456 789';

      // Act
      const result = generateTemporaryPassword(email, phone);

      // Assert
      expect(result).toBe('user@domain.pl123456789');
    });
  });
});
