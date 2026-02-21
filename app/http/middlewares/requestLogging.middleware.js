'use strict'

const Logger = require('@core/logger.core')

/**
 * Request Logging Middleware
 * Logs incoming HTTP requests and their performance
 */
const requestLoggingMiddleware = async (arg1, arg2, arg3) => {
    let req, res, next
    if (arg1 && arg1.req && arg1.res && arg1.next) {
        req = arg1.req
        res = arg1.res
        next = arg1.next
    } else {
        req = arg1
        res = arg2
        next = arg3
    }

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
