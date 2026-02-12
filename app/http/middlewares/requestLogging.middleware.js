'use strict'

const Logger = require('@core/logger.core')

/**
 * Request Logging Middleware
 * Logs incoming HTTP requests and their performance
 */
const requestLoggingMiddleware = async ({ req, res, next }) => {
    const start = Date.now()

    // Log after the response is sent
    res.on('finish', () => {
        const duration = Date.now() - start
        const method = req.method
        const url = req.originalUrl
        const status = res.statusCode
        const user = req.user ? ` (${req.user.token})` : ''

        Logger.debug(`HTTP ${method} ${url} - Status ${status} - ${duration}ms${user}`)
    })

    return next()
}

module.exports = requestLoggingMiddleware
