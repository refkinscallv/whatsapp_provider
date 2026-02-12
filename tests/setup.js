/**
 * Jest Test Setup
 * Global setup for all tests
 */

'use strict'

// Load module aliases
require('module-alias/register')

// Set test environment
process.env.NODE_ENV = 'test'

// Suppress console output during tests (optional)
if (process.env.SILENT_TESTS === 'true') {
    global.console = {
        ...console,
        log: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }
}

// Global test timeout
jest.setTimeout(10000)

// Mock logger to prevent file writes during tests
jest.mock('../core/logger.core', () => {
    return {
        init: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        set: jest.fn(),
        logger: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        },
    }
})

// Global beforeAll
beforeAll(() => {
    // Global setup before all tests
})

// Global afterAll
afterAll(() => {
    // Global cleanup after all tests
})
