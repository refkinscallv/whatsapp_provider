/**
 * Unit tests for Runtime Core Module
 */

const Runtime = require('../../core/runtime.core')
const config = require('../../app/config')

describe('Runtime Core', () => {
    // Store original env values
    const originalTZ = process.env.TZ
    const originalNodeEnv = process.env.NODE_ENV

    afterAll(() => {
        // Restore original values
        process.env.TZ = originalTZ
        process.env.NODE_ENV = originalNodeEnv
    })

    describe('Initialization', () => {
        test('should initialize without errors', () => {
            expect(() => {
                Runtime.init()
            }).not.toThrow()
        })

        test('should set timezone from config', () => {
            Runtime.init()
            expect(process.env.TZ).toBe(config.app.timezone)
        })

        test('should set NODE_ENV based on production flag', () => {
            Runtime.init()
            const expectedEnv = config.app.production ? 'production' : 'development'
            expect(process.env.NODE_ENV).toBe(expectedEnv)
        })
    })

    describe('Environment Configuration', () => {
        test('should set development environment when not production', () => {
            const originalProduction = config.app.production
            config.app.production = false

            Runtime.init()

            expect(process.env.NODE_ENV).toBe('development')

            // Restore
            config.app.production = originalProduction
        })

        test('should set production environment when production', () => {
            const originalProduction = config.app.production
            config.app.production = true

            Runtime.init()

            expect(process.env.NODE_ENV).toBe('production')

            // Restore
            config.app.production = originalProduction
        })
    })

    describe('Timezone Configuration', () => {
        test('should accept valid timezone', () => {
            const originalTimezone = config.app.timezone
            config.app.timezone = 'UTC'

            Runtime.init()

            expect(process.env.TZ).toBe('UTC')

            // Restore
            config.app.timezone = originalTimezone
        })

        test('should handle Asia/Jakarta timezone', () => {
            const originalTimezone = config.app.timezone
            config.app.timezone = 'Asia/Jakarta'

            Runtime.init()

            expect(process.env.TZ).toBe('Asia/Jakarta')

            // Restore
            config.app.timezone = originalTimezone
        })

        test('should handle America/New_York timezone', () => {
            const originalTimezone = config.app.timezone
            config.app.timezone = 'America/New_York'

            Runtime.init()

            expect(process.env.TZ).toBe('America/New_York')

            // Restore
            config.app.timezone = originalTimezone
        })
    })

    describe('Multiple Initializations', () => {
        test('should handle multiple init calls', () => {
            expect(() => {
                Runtime.init()
                Runtime.init()
                Runtime.init()
            }).not.toThrow()
        })

        test('should maintain last timezone setting', () => {
            const originalTimezone = config.app.timezone

            config.app.timezone = 'UTC'
            Runtime.init()
            expect(process.env.TZ).toBe('UTC')

            config.app.timezone = 'Asia/Tokyo'
            Runtime.init()
            expect(process.env.TZ).toBe('Asia/Tokyo')

            // Restore
            config.app.timezone = originalTimezone
        })
    })
})
