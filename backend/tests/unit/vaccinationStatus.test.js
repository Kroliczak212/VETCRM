/**
 * Unit Tests for Vaccination Status Calculation
 *
 * Tests the status calculation logic for vaccinations.
 * Status can be: 'overdue', 'due_soon', 'current', or null
 *
 * Convention: AAA (Arrange-Act-Assert)
 *
 * @file tests/unit/vaccinationStatus.test.js
 */

/**
 * Extracted _calculateStatus logic for testing
 * (Mirrors VaccinationsService._calculateStatus)
 *
 * @param {Date|string|null} nextDueDate
 * @returns {string|null}
 */
function calculateVaccinationStatus(nextDueDate) {
  if (!nextDueDate) return null;

  const today = new Date();
  const dueDate = new Date(nextDueDate);
  const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 30) return 'due_soon';
  return 'current';
}

describe('Vaccination Status Calculation', () => {
  // Store original Date for restoration
  const RealDate = Date;

  afterEach(() => {
    global.Date = RealDate;
  });

  /**
   * Helper to mock current time
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

  describe('calculateVaccinationStatus()', () => {
    test('should return null when nextDueDate is null', () => {
      // Arrange
      const nextDueDate = null;

      // Act
      const status = calculateVaccinationStatus(nextDueDate);

      // Assert
      expect(status).toBeNull();
    });

    test('should return null when nextDueDate is undefined', () => {
      // Arrange
      const nextDueDate = undefined;

      // Act
      const status = calculateVaccinationStatus(nextDueDate);

      // Assert
      expect(status).toBeNull();
    });

    test('should return "overdue" when due date is in the past', () => {
      // Arrange
      const now = new Date('2024-06-15');
      mockCurrentTime(now);
      const nextDueDate = '2024-06-01'; // 14 days ago

      // Act
      const status = calculateVaccinationStatus(nextDueDate);

      // Assert
      expect(status).toBe('overdue');
    });

    test('should return "overdue" when due date was yesterday', () => {
      // Arrange
      const now = new Date('2024-06-15');
      mockCurrentTime(now);
      const nextDueDate = '2024-06-14'; // 1 day ago

      // Act
      const status = calculateVaccinationStatus(nextDueDate);

      // Assert
      expect(status).toBe('overdue');
    });

    test('should return "due_soon" when due date is tomorrow', () => {
      // Arrange
      const now = new Date('2024-06-15T00:00:00');
      mockCurrentTime(now);
      const nextDueDate = '2024-06-16'; // tomorrow (1 day away)

      // Act
      const status = calculateVaccinationStatus(nextDueDate);

      // Assert
      expect(status).toBe('due_soon');
    });

    test('should return "due_soon" when due date is within 30 days', () => {
      // Arrange
      const now = new Date('2024-06-15');
      mockCurrentTime(now);
      const nextDueDate = '2024-07-01'; // 16 days from now

      // Act
      const status = calculateVaccinationStatus(nextDueDate);

      // Assert
      expect(status).toBe('due_soon');
    });

    test('should return "due_soon" when due date is exactly 30 days away', () => {
      // Arrange
      const now = new Date('2024-06-15');
      mockCurrentTime(now);
      const nextDueDate = '2024-07-15'; // exactly 30 days

      // Act
      const status = calculateVaccinationStatus(nextDueDate);

      // Assert
      expect(status).toBe('due_soon');
    });

    test('should return "current" when due date is more than 30 days away', () => {
      // Arrange
      const now = new Date('2024-06-15');
      mockCurrentTime(now);
      const nextDueDate = '2024-07-20'; // 35 days from now

      // Act
      const status = calculateVaccinationStatus(nextDueDate);

      // Assert
      expect(status).toBe('current');
    });

    test('should return "current" when due date is far in the future', () => {
      // Arrange
      const now = new Date('2024-06-15');
      mockCurrentTime(now);
      const nextDueDate = '2025-06-15'; // 1 year from now

      // Act
      const status = calculateVaccinationStatus(nextDueDate);

      // Assert
      expect(status).toBe('current');
    });

    test('should handle Date object as input', () => {
      // Arrange
      const now = new Date('2024-06-15');
      mockCurrentTime(now);
      const nextDueDate = new Date('2024-06-01'); // Date object

      // Act
      const status = calculateVaccinationStatus(nextDueDate);

      // Assert
      expect(status).toBe('overdue');
    });

    test('should handle ISO string date format', () => {
      // Arrange
      const now = new Date('2024-06-15');
      mockCurrentTime(now);
      const nextDueDate = '2024-08-01T00:00:00.000Z'; // ISO format

      // Act
      const status = calculateVaccinationStatus(nextDueDate);

      // Assert
      expect(status).toBe('current');
    });
  });

  describe('Edge Cases', () => {
    test('should handle boundary: 31 days away should be "current"', () => {
      // Arrange
      const now = new Date('2024-06-15');
      mockCurrentTime(now);
      const nextDueDate = '2024-07-16'; // 31 days

      // Act
      const status = calculateVaccinationStatus(nextDueDate);

      // Assert
      expect(status).toBe('current');
    });

    test('should handle leap year dates', () => {
      // Arrange
      const now = new Date('2024-02-28'); // 2024 is leap year
      mockCurrentTime(now);
      const nextDueDate = '2024-02-29'; // leap day

      // Act
      const status = calculateVaccinationStatus(nextDueDate);

      // Assert
      expect(status).toBe('due_soon');
    });

    test('should handle year boundary', () => {
      // Arrange
      const now = new Date('2024-12-31');
      mockCurrentTime(now);
      const nextDueDate = '2025-01-15'; // 15 days into new year

      // Act
      const status = calculateVaccinationStatus(nextDueDate);

      // Assert
      expect(status).toBe('due_soon');
    });
  });
});
