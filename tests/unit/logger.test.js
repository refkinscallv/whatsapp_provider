/**
 * Unit tests for Logger Core Module
 */

const Logger = require('../../core/logger.core')
const fs = require('fs')
const path = require('path')

describe('Logger Core', () => {
    const logDir = path.join(__dirname, '../../logs')

    beforeAll(() => {
        // Initialize logger
        Logger.init()
    })

    afterAll(() => {
        // Clean up test logs if needed
        // Uncomment to clean logs after tests
        // if (fs.existsSync(logDir)) {
        //     fs.rmSync(logDir, { recursive: true, force: true })
        // }
    })

    describe('Initialization', () => {
        test('should initialize logger', () => {
            expect(Logger.logger).toBeDefined()
            expect(Logger.logger).not.toBeNull()
        })

        test('should create logs directory', () => {
            expect(fs.existsSync(logDir)).toBe(true)
        })
    })

    describe('Logging Methods', () => {
        test('should log info message', () => {
            expect(() => {
                Logger.info('test', 'This is an info message')
            }).not.toThrow()
        })

        test('should log error message', () => {
            expect(() => {
                Logger.error('test', 'This is an error message')
            }).not.toThrow()
        })

        test('should log warning message', () => {
            expect(() => {
                Logger.warn('test', 'This is a warning message')
            }).not.toThrow()
        })

        test('should log debug message', () => {
            expect(() => {
                Logger.debug('test', 'This is a debug message')
            }).not.toThrow()
        })

        test('should log error object', () => {
            const error = new Error('Test error')
            expect(() => {
                Logger.set(error, 'test')
            }).not.toThrow()
        })
    })

    describe('Log Files', () => {
        test('should create error.log file', (done) => {
            Logger.error('test', 'Error for file test')

            // Wait for file write
            setTimeout(() => {
                const errorLogPath = path.join(logDir, 'error.log')
                expect(fs.existsSync(errorLogPath)).toBe(true)
                done()
            }, 1000)
        })

        test('should create combined.log file', (done) => {
            Logger.info('test', 'Info for file test')

            // Wait for file write
            setTimeout(() => {
                const combinedLogPath = path.join(logDir, 'combined.log')
                expect(fs.existsSync(combinedLogPath)).toBe(true)
                done()
            }, 1000)
        })
    })

    describe('Context and Message', () => {
        test('should accept context parameter', () => {
            expect(() => {
                Logger.info('user-module', 'User action')
            }).not.toThrow()
        })

        test('should accept empty context', () => {
            expect(() => {
                Logger.info('', 'Message without context')
            }).not.toThrow()
        })

        test('should handle long messages', () => {
            const longMessage = 'A'.repeat(1000)
            expect(() => {
                Logger.info('test', longMessage)
            }).not.toThrow()
        })

        test('should handle special characters in message', () => {
            expect(() => {
                Logger.info('test', 'Special chars: !@#$%^&*()')
            }).not.toThrow()
        })
    })
})
