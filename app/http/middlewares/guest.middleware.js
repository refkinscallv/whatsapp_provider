'use strict'

const jwt = require('@core/jwt.core')

/**
 * Guest Middleware
 * Redirects authenticated users to the dashboard
 */
const guestMiddleware = async (arg1, arg2, arg3) => {
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
