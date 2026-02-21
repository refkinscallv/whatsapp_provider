'use strict'

const config = require('@app/config')
const Logger = require('@core/logger.core')

/**
 * Internal Auth Middleware
 * Validates server-to-server calls using a master key
 */
const internalAuthMiddleware = async (arg1, arg2, arg3) => {
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

    try {
        const internalKey = req.headers['x-internal-key'] || req.query.internal_key || req.headers['x-api-key']

        if (!internalKey || internalKey !== config.app.master_key) {
            Logger.warn(`Unauthorized internal API attempt from ${req.ip}`)
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Internal access only'
            })
        }

        // Attach a system user to the request
        req.user = {
            token: 'SYSTEM',
            name: 'System Internal',
            is_admin: true,
            role: 'ADMIN',
            is_internal: true
        }

        return next()
    } catch (err) {
        Logger.error('Internal Auth Middleware Error', err)
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}

module.exports = internalAuthMiddleware
