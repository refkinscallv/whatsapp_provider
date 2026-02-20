'use strict'

const config = require('@app/config')

/**
 * Error Middleware
 * Global error handler for the application
 */
const errorMiddleware = (err, { req, res, next }) => {
    Logger.error('Global Error Handler', err)

    const statusCode = err.statusCode || 500
    const message = err.message || 'Internal Server Error'

    return res.status(statusCode).json({
        success: false,
        message,
        stack: !config.app.production ? err.stack : undefined
    })
}

module.exports = errorMiddleware
