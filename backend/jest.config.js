/**
 * Jest Configuration for VetCRM Backend
 *
 * @type {import('jest').Config}
 */
module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directory
  rootDir: '.',

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js'
  ],

  // Setup files
  setupFilesAfterEnv: ['./tests/setup.js'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/docs/**',
    '!src/migrations/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Timeout for tests
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true
};
