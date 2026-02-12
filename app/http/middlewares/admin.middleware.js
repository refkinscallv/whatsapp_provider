'use strict'

/**
 * Admin Middleware
 * Checks if the authenticated user is an admin
 */
module.exports = (role = 'admin') => {
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
            if (!req.user || !req.user.is_admin) {
                if (req.accepts('html')) {
                    return res.redirect('/dashboard?error=unauthorized')
                }
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Super Admin privileges required.'
                })
            }
            next()
        } catch (err) {
            if (res && typeof res.status === 'function') {
                return res.status(500).json({
                    success: false,
                    message: err.message
                })
            }
            if (typeof next === 'function') {
                next(err)
            }
        }
    }
}
