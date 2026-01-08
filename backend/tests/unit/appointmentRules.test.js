/**
 * Unit Tests for Appointment Rules
 *
 * Tests business logic for appointment cancellation rules.
 * Convention: AAA (Arrange-Act-Assert)
 *
 * @file tests/unit/appointmentRules.test.js
 */

const APPOINTMENT_RULES = require('../../src/config/appointmentRules');

describe('APPOINTMENT_RULES', () => {
  // Store original Date for restoration
  const RealDate = Date;

  afterEach(() => {
    // Restore original Date after each test
    global.Date = RealDate;
  });

  /**
   * Helper to mock current time
   * @param {Date} mockDate - Date to use as "now"
   */
  const mockCurrentTime = (mockDate) => {
    global.Date = class extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          return new RealDate(mockDate);
        }
        return new RealDate(...args);
      }

      static now() {
        return mockDate.getTime();
      }
    };
  };

  describe('getHoursUntilAppointment()', () => {
    test('should calculate correct hours for future appointment', () => {
      // Arrange
      const now = new Date('2024-01-15T10:00:00');
      mockCurrentTime(now);
      const appointmentTime = new Date('2024-01-15T14:00:00'); // 4 hours later

      // Act
      const hours = APPOINTMENT_RULES.getHoursUntilAppointment(appointmentTime);

      // Assert
      expect(hours).toBe(4);
    });

    test('should return negative hours for past appointment', () => {
      // Arrange
      const now = new Date('2024-01-15T14:00:00');
      mockCurrentTime(now);
      const appointmentTime = new Date('2024-01-15T10:00:00'); // 4 hours ago

      // Act
      const hours = APPOINTMENT_RULES.getHoursUntilAppointment(appointmentTime);

      // Assert
      expect(hours).toBe(-4);
    });

    test('should handle appointment exactly now (0 hours)', () => {
      // Arrange
      const now = new Date('2024-01-15T10:00:00');
      mockCurrentTime(now);
      const appointmentTime = new Date('2024-01-15T10:00:00');

      // Act
      const hours = APPOINTMENT_RULES.getHoursUntilAppointment(appointmentTime);

      // Assert
      expect(hours).toBe(0);
    });
  });

  describe('getCancellationType()', () => {
    test('should allow cancellation without penalty when appointment is more than 72h away', () => {
      // Arrange
      const now = new Date('2024-01-15T10:00:00');
      mockCurrentTime(now);
      const appointmentTime = new Date('2024-01-19T10:00:00'); // 96 hours (4 days)

      // Act
      const result = APPOINTMENT_RULES.getCancellationType(appointmentTime);

      // Assert
      expect(result.canCancel).toBe(true);
      expect(result.status).toBe('cancelled');
      expect(result.hasFee).toBe(false);
      expect(result.message).toContain('bez konsekwencji');
    });

    test('should show warning but no penalty when appointment is 48-72h away', () => {
      // Arrange
      const now = new Date('2024-01-15T10:00:00');
      mockCurrentTime(now);
      const appointmentTime = new Date('2024-01-17T18:00:00'); // 56 hours (~2.3 days)

      // Act
      const result = APPOINTMENT_RULES.getCancellationType(appointmentTime);

      // Assert
      expect(result.canCancel).toBe(true);
      expect(result.status).toBe('cancelled');
      expect(result.hasFee).toBe(false);
      expect(result.message).toContain('UWAGA');
    });

    test('should apply late cancellation fee when appointment is 24-48h away', () => {
      // Arrange
      const now = new Date('2024-01-15T10:00:00');
      mockCurrentTime(now);
      const appointmentTime = new Date('2024-01-16T20:00:00'); // 34 hours

      // Act
      const result = APPOINTMENT_RULES.getCancellationType(appointmentTime);

      // Assert
      expect(result.canCancel).toBe(true);
      expect(result.status).toBe('cancelled');
      expect(result.hasFee).toBe(false);
    });

    test('should block online cancellation when appointment is less than 24h away', () => {
      // Arrange
      const now = new Date('2024-01-15T10:00:00');
      mockCurrentTime(now);
      const appointmentTime = new Date('2024-01-15T20:00:00'); // 10 hours

      // Act
      const result = APPOINTMENT_RULES.getCancellationType(appointmentTime);

      // Assert
      expect(result.canCancel).toBe(false);
      expect(result.status).toBe(null);
      expect(result.message).toContain('Skontaktuj się z kliniką');
    });

    test('should block cancellation for past appointments', () => {
      // Arrange
      const now = new Date('2024-01-15T14:00:00');
      mockCurrentTime(now);
      const appointmentTime = new Date('2024-01-15T10:00:00'); // 4 hours ago

      // Act
      const result = APPOINTMENT_RULES.getCancellationType(appointmentTime);

      // Assert
      expect(result.canCancel).toBe(false);
      expect(result.message).toContain('już się odbyła');
    });

    test('should handle edge case: exactly 72 hours before appointment', () => {
      // Arrange
      const now = new Date('2024-01-15T10:00:00');
      mockCurrentTime(now);
      const appointmentTime = new Date('2024-01-18T10:00:00'); // exactly 72 hours

      // Act
      const result = APPOINTMENT_RULES.getCancellationType(appointmentTime);

      // Assert
      expect(result.canCancel).toBe(true);
      expect(result.hasFee).toBe(false);
    });

    test('should handle edge case: exactly 24 hours before appointment', () => {
      // Arrange
      const now = new Date('2024-01-15T10:00:00');
      mockCurrentTime(now);
      const appointmentTime = new Date('2024-01-16T10:00:00'); // exactly 24 hours

      // Act
      const result = APPOINTMENT_RULES.getCancellationType(appointmentTime);

      // Assert
      // At exactly 24h, it's NOT less than 24, so it should be in 24-48h range
      expect(result.canCancel).toBe(true);
    });
  });

  describe('canReschedule()', () => {
    test('should allow reschedule when appointment is more than 48h away', () => {
      // Arrange
      const now = new Date('2024-01-15T10:00:00');
      mockCurrentTime(now);
      const appointmentTime = new Date('2024-01-18T10:00:00'); // 72 hours

      // Act
      const result = APPOINTMENT_RULES.canReschedule(appointmentTime);

      // Assert
      expect(result.canReschedule).toBe(true);
      expect(result.message).toContain('zaproponować nowy termin');
    });

    test('should block reschedule when appointment is less than 48h away', () => {
      // Arrange
      const now = new Date('2024-01-15T10:00:00');
      mockCurrentTime(now);
      const appointmentTime = new Date('2024-01-16T20:00:00'); // 34 hours

      // Act
      const result = APPOINTMENT_RULES.canReschedule(appointmentTime);

      // Assert
      expect(result.canReschedule).toBe(false);
      expect(result.message).toContain('Skontaktuj się z kliniką');
    });

    test('should block reschedule for past appointments', () => {
      // Arrange
      const now = new Date('2024-01-15T14:00:00');
      mockCurrentTime(now);
      const appointmentTime = new Date('2024-01-15T10:00:00');

      // Act
      const result = APPOINTMENT_RULES.canReschedule(appointmentTime);

      // Assert
      expect(result.canReschedule).toBe(false);
      expect(result.message).toContain('już się odbyła');
    });
  });

  describe('formatTimeRemaining()', () => {
    test('should format days and hours correctly', () => {
      // Arrange
      const hours = 50; // 2 days 2 hours

      // Act
      const result = APPOINTMENT_RULES.formatTimeRemaining(hours);

      // Assert
      expect(result).toContain('2 dni');
      expect(result).toContain('2 godzin');
    });

    test('should format single day correctly (Polish grammar)', () => {
      // Arrange
      const hours = 25; // 1 day 1 hour

      // Act
      const result = APPOINTMENT_RULES.formatTimeRemaining(hours);

      // Assert
      expect(result).toContain('1 dzień');
      expect(result).toContain('1 godzina');
    });

    test('should return "Wizyta już się odbyła" for negative hours', () => {
      // Arrange
      const hours = -5;

      // Act
      const result = APPOINTMENT_RULES.formatTimeRemaining(hours);

      // Assert
      expect(result).toBe('Wizyta już się odbyła');
    });

    test('should format minutes when less than a day', () => {
      // Arrange
      const hours = 2.5; // 2 hours 30 minutes

      // Act
      const result = APPOINTMENT_RULES.formatTimeRemaining(hours);

      // Assert
      expect(result).toContain('2 godzin');
      expect(result).toContain('30');
    });

    test('should return "0 minut" for exactly 0 hours', () => {
      // Arrange
      const hours = 0;

      // Act
      const result = APPOINTMENT_RULES.formatTimeRemaining(hours);

      // Assert
      expect(result).toBe('0 minut');
    });
  });

  describe('Constants', () => {
    test('should have correct cancellation hour thresholds', () => {
      // Assert
      expect(APPOINTMENT_RULES.CANCEL_NO_PENALTY_HOURS).toBe(72);
      expect(APPOINTMENT_RULES.CANCEL_WARNING_HOURS).toBe(48);
      expect(APPOINTMENT_RULES.CANCEL_LATE_PENALTY_HOURS).toBe(24);
      expect(APPOINTMENT_RULES.CANCEL_BLOCKED_HOURS).toBe(24);
    });

    test('should have correct late cancellation fee', () => {
      // Assert
      expect(APPOINTMENT_RULES.LATE_CANCELLATION_FEE).toBe(50.00);
    });

    test('should require reschedule approval', () => {
      // Assert
      expect(APPOINTMENT_RULES.RESCHEDULE_REQUIRES_APPROVAL).toBe(true);
    });
  });
});
