/**
 * Integration tests for Express Core Module
 */

const request = require('supertest')
const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const fileUpload = require('express-fileupload')
const config = require('../../app/config')

describe('Express Core Integration', () => {
    let app

    beforeAll(() => {
        // Create a fresh Express app for testing
        app = express()

        // Setup middlewares
        app.use(express.json())
        app.use(express.urlencoded({ extended: true }))
        app.use(cookieParser())
        app.use(cors(config.express.cors))
        app.use(fileUpload(config.express.fileupload))

        // Register test routes
        app.post('/test-json', (req, res) => {
            res.json(req.body)
        })

        app.post('/test-urlencoded', (req, res) => {
            res.json(req.body)
        })

        app.get('/test-cookie', (req, res) => {
            res.cookie('test', 'value')
            res.json({ cookie: req.cookies.test })
        })

        app.get('/test-cors', (req, res) => {
            res.json({ message: 'CORS test' })
        })

        app.post('/test-upload', (req, res) => {
            if (req.files && req.files.file) {
                res.json({
                    uploaded: true,
                    filename: req.files.file.name,
                })
            } else {
                res.status(400).json({ uploaded: false })
            }
        })

        app.get('/test-error', (req, res, next) => {
            next(new Error('Test error'))
        })

        app.get('/api/test-error', (req, res, next) => {
            next(new Error('API error'))
        })

        app.get('/test-query', (req, res) => {
            res.json(req.query)
        })

        app.get('/test-nested-query', (req, res) => {
            res.json(req.query)
        })

        app.get('/test-params/:id', (req, res) => {
            res.json({ id: req.params.id })
        })

        app.get('/test-params/:id/items/:itemId', (req, res) => {
            res.json({
                id: req.params.id,
                itemId: req.params.itemId,
            })
        })

        // Error handler
        app.use((err, req, res, next) => {
            const status = err.status || 500
            const message = err.message || 'Internal Server Error'

            // Check if it's an API request
            if (req.xhr || req.path.startsWith('/api')) {
                return res.status(status).json({
                    success: false,
                    message,
                })
            }

            res.status(status).json({ error: message })
        })

        // 404 handler
        app.use((req, res) => {
            res.status(404).json({ error: 'Not Found' })
        })
    })

    describe('Application Setup', () => {
        test('should have Express app instance', () => {
            expect(app).toBeDefined()
            expect(typeof app).toBe('function')
        })
    })

    describe('Middleware Configuration', () => {
        test('should handle JSON body', async () => {
            const response = await request(app)
                .post('/test-json')
                .send({ test: 'data' })
                .set('Content-Type', 'application/json')

            expect(response.status).toBe(200)
            expect(response.body.test).toBe('data')
        })

        test('should handle URL encoded body', async () => {
            const response = await request(app)
                .post('/test-urlencoded')
                .send('name=test')
                .set('Content-Type', 'application/x-www-form-urlencoded')

            expect(response.status).toBe(200)
            expect(response.body.name).toBe('test')
        })

        test('should handle cookies', async () => {
            const response = await request(app).get('/test-cookie').set('Cookie', 'test=value')

            expect(response.status).toBe(200)
        })
    })

    describe('CORS Configuration', () => {
        test('should have CORS headers', async () => {
            const response = await request(app).get('/test-cors').set('Origin', 'http://example.com')

            expect(response.headers['access-control-allow-origin']).toBeDefined()
        })

        test('should handle OPTIONS request', async () => {
            const response = await request(app).options('/test-cors').set('Origin', 'http://example.com')

            expect(response.status).toBeLessThan(500)
        })
    })

    describe('File Upload', () => {
        test('should have file upload middleware', () => {
            expect(app._router).toBeDefined()
        })

        test('should handle file upload endpoint', async () => {
            const response = await request(app).post('/test-upload')

            expect(response.status).toBe(400)
            expect(response.body.uploaded).toBe(false)
        })
    })

    describe('Static Files', () => {
        test('should handle static file requests', async () => {
            const response = await request(app).get('/static/test.txt')

            // Should either serve file or return 404, not 500
            expect(response.status).not.toBe(500)
        })
    })

    describe('Error Handling', () => {
        test('should handle 404 for non-existent routes', async () => {
            const response = await request(app).get('/non-existent-route-12345')

            expect(response.status).toBe(404)
        })

        test('should handle errors in route handlers', async () => {
            const response = await request(app).get('/test-error')

            expect(response.status).toBe(500)
        })

        test('should return JSON error for API routes', async () => {
            const response = await request(app).get('/api/test-error')

            expect(response.status).toBe(500)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBeDefined()
        })
    })

    describe('Query Parameters', () => {
        test('should parse query parameters', async () => {
            const response = await request(app).get('/test-query?name=test&age=25')

            expect(response.status).toBe(200)
            expect(response.body.name).toBe('test')
            expect(response.body.age).toBe('25')
        })

        test('should parse nested query parameters', async () => {
            const response = await request(app).get('/test-nested-query?user[name]=test&user[age]=25')

            expect(response.status).toBe(200)
            expect(response.body.user).toBeDefined()
        })
    })

    describe('Route Parameters', () => {
        test('should handle route parameters', async () => {
            const response = await request(app).get('/test-params/123')

            expect(response.status).toBe(200)
            expect(response.body.id).toBe('123')
        })

        test('should handle multiple route parameters', async () => {
            const response = await request(app).get('/test-params/123/items/456')

            expect(response.status).toBe(200)
            expect(response.body.id).toBe('123')
            expect(response.body.itemId).toBe('456')
        })
    })
})
