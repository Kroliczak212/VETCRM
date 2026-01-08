/**
 * Jest Global Setup
 *
 * This file is executed before all tests run.
 * Used for global configuration and mocks.
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console.log in tests to reduce noise (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
// };

// Global test utilities
global.testUtils = {
  /**
   * Create a date relative to now
   * @param {number} hours - Hours from now (positive = future, negative = past)
   * @returns {Date}
   */
  createDateFromNow(hours) {
    const date = new Date();
    date.setTime(date.getTime() + hours * 60 * 60 * 1000);
    return date;
  },

  /**
   * Format date to ISO string without milliseconds
   * @param {Date} date
   * @returns {string}
   */
  formatDate(date) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }
};

// Increase timeout for integration tests
jest.setTimeout(10000);
