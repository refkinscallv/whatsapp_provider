/**
 * Jest Configuration
 * Test framework configuration for unit and integration tests
 */

module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Coverage configuration
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['core/**/*.js', 'app/**/*.js', '!app/config.js', '!**/node_modules/**', '!**/tests/**'],

    // Test match patterns
    testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.js'],

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

    // Module paths
    moduleNameMapper: {
        '^@app/(.*)$': '<rootDir>/app/$1',
        '^@core/(.*)$': '<rootDir>/core/$1',
        '^@public/(.*)$': '<rootDir>/public/$1',
    },

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50,
        },
    },

    // Test timeout
    testTimeout: 10000,

    // Verbose output
    verbose: true,

    // Clear mocks between tests
    clearMocks: true,

    // Restore mocks between tests
    restoreMocks: true,

    // Detect open handles
    detectOpenHandles: true,

    // Force exit after tests
    forceExit: true,
}
