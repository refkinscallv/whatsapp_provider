'use strict'

/**
 * Role Middleware
 * Restricts access to specific user types/roles
 * @param {Array|string} allowedRoles - Single role or array of allowed roles
 */
const roleMiddleware = (allowedRoles) => {
    return async ({ req, res, next }) => {
        try {
            const user = req.user
            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

            // This assumes req.user has been populated by auth or apiKey middleware
            // and contains user details including user_type or is_admin

            // For now we check user_type from the request (attached by auth middleware)
            // Note: Our current auth middleware only attaches the token. 
            // We should update it to attach full user info or check DB here if needed.

            // To be safe, we'll fetch user info if not fully available
            const db = require('@core/database.core')
            const fullUser = await db.models.User.findOne({ where: { token: user.token } })

            if (!fullUser) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not found'
                })
            }

            if (fullUser.is_admin) return next() // Admins have access to everything

            if (!roles.includes(fullUser.user_type)) {
                return res.status(403).json({
                    success: false,
                    message: 'Permission denied: Insufficient privileges'
                })
            }

            return next()
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }
}

module.exports = roleMiddleware
