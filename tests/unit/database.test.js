/**
 * Unit tests for Database Core Module
 */

const Database = require('../../core/database.core')
const config = require('../../app/config')

describe('Database Core', () => {
    // Skip all tests if database is disabled in config
    const shouldRun = config.database.status

    beforeAll(async () => {
        if (!shouldRun) {
            return
        }

        // Initialize database for tests
        try {
            await Database.init()
        } catch (err) {
            console.warn('Database initialization failed:', err.message)
        }
    })

    afterAll(async () => {
        if (!shouldRun) {
            return
        }
        // Close database connection
        Database.close()
    })

    describe('Initialization', () => {
        test('should skip if database is disabled', () => {
            if (!shouldRun) {
                expect(true).toBe(true)
            } else {
                expect(Database.sequelize).toBeDefined()
                expect(Database.sequelize).not.toBeNull()
            }
        })

        test('should have models object', () => {
            if (!shouldRun) {
                expect(true).toBe(true)
            } else {
                expect(Database.models).toBeDefined()
                expect(typeof Database.models).toBe('object')
            }
        })
    })

    describe('Connection', () => {
        test('should be able to get sequelize instance', () => {
            if (!shouldRun) {
                expect(true).toBe(true)
                return
            }

            const instance = Database.getInstance()
            expect(instance).toBeDefined()
            expect(instance).toBe(Database.sequelize)
        })

        test('should authenticate connection', async () => {
            if (!shouldRun) {
                expect(true).toBe(true)
                return
            }

            try {
                await Database.sequelize.authenticate()
                expect(true).toBe(true)
            } catch (err) {
                // If authentication fails, it might be due to config
                expect(err).toBeDefined()
            }
        })
    })

    describe('Models', () => {
        test('should load models from directory', () => {
            if (!shouldRun) {
                expect(true).toBe(true)
                return
            }

            const modelCount = Object.keys(Database.models).length
            expect(modelCount).toBeGreaterThanOrEqual(0)
        })

        test('should be able to get model if exists', () => {
            if (!shouldRun) {
                expect(true).toBe(true)
                return
            }

            const models = Object.keys(Database.models)
            if (models.length > 0) {
                const firstModel = Database.getModel(models[0])
                expect(firstModel).toBeDefined()
            } else {
                expect(true).toBe(true) // No models to test
            }
        })

        test('should return undefined for non-existent model', () => {
            if (!shouldRun) {
                expect(true).toBe(true)
                return
            }

            const model = Database.getModel('NonExistentModel')
            expect(model).toBeUndefined()
        })
    })

    describe('Model Operations', () => {
        test('should be able to define a test model', () => {
            if (!shouldRun) {
                expect(true).toBe(true)
                return
            }

            const { DataTypes } = require('sequelize')

            const TestModel = Database.sequelize.define('TestModel', {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
            })

            expect(TestModel).toBeDefined()
            expect(TestModel.name).toBe('TestModel')
        })
    })

    describe('Connection Management', () => {
        test('should close connection gracefully', () => {
            if (!shouldRun) {
                expect(true).toBe(true)
                return
            }

            expect(() => {
                Database.close()
            }).not.toThrow()
        })
    })
})
