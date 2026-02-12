'use strict'

const jwt = require('@core/jwt.core')

/**
 * Guest Middleware
 * Redirects authenticated users to the dashboard
 */
const guestMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null)

        if (token) {
            const decoded = jwt.verify(token)
            if (decoded) {
                return res.redirect('/dashboard')
            }
        }

        next()
    } catch (err) {
        next()
    }
}

module.exports = guestMiddleware
