'use strict'

const Logger = require('@core/logger.core')
const config = require('@app/config')

// In-memory rate limiting for simplicity
// In production, use Redis for distributed rate limiting
const rateLimits = new Map()

/**
 * Rate Limiting Middleware
 * Prevents API abuse by limiting requests per IP/User
 * @param {object} options - Rate limit options (max, windowMs)
 */
const rateLimitMiddleware = (options = {}) => {
    const {
        max = config.rateLimit?.max || 100,
        windowMs = config.rateLimit?.windowMs || 60000
    } = options

    return async (arg1, arg2, arg3) => {
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
            // Super Admin is exempt from rate limits
            if (req.user && req.user.role === 'SUPER_ADMIN') {
                return next()
            }

            const key = req.ip || (req.user ? req.user.token : 'anonymous')
            const now = Date.now()

            if (!rateLimits.has(key)) {
                rateLimits.set(key, { count: 1, resetAt: now + windowMs })
                return next()
            }

            const limit = rateLimits.get(key)
            if (now > limit.resetAt) {
                rateLimits.set(key, { count: 1, resetAt: now + windowMs })
                return next()
            }

            limit.count++
            if (limit.count > max) {
                Logger.warn(`Rate limit exceeded for ${key}`)
                return res.status(429).json({
                    success: false,
                    message: 'Too many requests, please try again later'
                })
            }

            return next()
        } catch (err) {
            return next() // Don't block on error in limit logic
        }
    }
}

// Clean up memory occasionally
setInterval(() => {
    const now = Date.now()
    for (const [key, limit] of rateLimits.entries()) {
        if (now > limit.resetAt) {
            rateLimits.delete(key)
        }
    }
}, 300000) // Every 5 minutes

module.exports = rateLimitMiddleware
