'use strict'

const config = require('@app/config')

/**
 * Error Middleware
 * Global error handler for the application
 */
const errorMiddleware = (arg1, arg2, arg3, arg4) => {
    let err, req, res, next
    if (arg1 instanceof Error && arg2 && arg2.req && arg2.res && arg2.next) {
        err = arg1
        req = arg2.req
        res = arg2.res
        next = arg2.next
    } else {
        err = arg1
        req = arg2
        res = arg3
        next = arg4
    }

    if (!res) {
        Logger.error('Error middleware reached without Response object', err)
        return
    }
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
