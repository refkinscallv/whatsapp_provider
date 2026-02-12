'use strict'

const jwt = require('@core/jwt.core')

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const authMiddleware = async (arg1, arg2, arg3) => {
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
        // Get token from cookie or Authorization header
        let token = req.cookies.token

        if (!token) {
            const authHeader = req.headers.authorization
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7)
            }
        }

        if (!token) {
            // Check if it's an API request
            if (req.path.startsWith('/api')) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                })
            }
            // Otherwise redirect to login
            return res.redirect('/login')
        }

        // Verify token
        const decoded = jwt.verify(token)

        if (!decoded || !decoded.token) {
            // Clear invalid cookie
            res.clearCookie('token')

            if (req.path.startsWith('/api')) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token',
                })
            }
            return res.redirect('/login')
        }

        // Fetch latest user data from database
        const db = require('@core/database.core')
        const user = await db.models.User.findOne({
            where: { token: decoded.token },
            attributes: { exclude: ['password'] }
        })

        if (!user) {
            res.clearCookie('token')
            if (req.path.startsWith('/api')) {
                return res.status(401).json({
                    success: false,
                    message: 'User account not found or removed',
                })
            }
            return res.redirect('/login')
        }

        if (user.status !== 'ACTIVE') {
            res.clearCookie('token')
            if (req.path.startsWith('/api')) {
                return res.status(401).json({
                    success: false,
                    message: `Account is ${user.status.toLowerCase()}`,
                })
            }
            return res.redirect('/login')
        }

        // Attach updated user to request
        req.user = user.toJSON()
        // Add helper identifying it's a session-based auth (for comparison with API-key based)
        req.user.auth_type = 'SESSION'

        next()
    } catch (err) {
        if (req && req.path && req.path.startsWith('/api')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication failed',
            })
        }
        if (res && typeof res.redirect === 'function') {
            return res.redirect('/login')
        }
        if (typeof next === 'function') {
            next(err)
        }
    }
}

module.exports = authMiddleware
