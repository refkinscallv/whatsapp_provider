'use strict'

const db = require('@core/database.core')

/**
 * Subscription Middleware
 * Checks if user has an active subscription and hasn't exceeded limits
 * @param {string} resource - The resource to check (messages, devices, etc.)
 */
const subscriptionMiddleware = (resource) => {
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
            const appModeService = require('@app/services/appMode.service')
            const isSaaS = await appModeService.isSubscriptionEnabled()

            // Bypass if not in SaaS mode
            if (!isSaaS) {
                return next()
            }

            const user = req.user
            if (!user) {
                return res.status(401).json({ success: false, message: 'Authentication required' })
            }

            // Super Admin has no limits
            if (user.role === 'SUPER_ADMIN') {
                return next()
            }

            const userToken = user.token

            // 1. Find active subscription
            const subscription = await db.models.UserSubscription.findOne({
                where: { user_token: userToken, status: 'ACTIVE' }
            })

            if (!subscription) {
                return res.status(403).json({
                    success: false,
                    message: 'No active subscription found'
                })
            }

            // 2. Find usage stats
            const usage = await db.models.UserSubscriptionUsage.findOne({
                where: { subscription_token: subscription.token }
            })

            if (!usage) {
                return res.status(403).json({
                    success: false,
                    message: 'Subscription usage record not found'
                })
            }

            // Check specific resource limits
            if (resource === 'messages') {
                if (usage.remaining_message <= 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'Message limit reached for your current subscription'
                    })
                }
            } else if (resource === 'devices') {
                if (usage.remaining_device <= 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'Device limit reached for your current subscription'
                    })
                }
            } else if (resource === 'api_keys') {
                if (usage.remaining_api_key <= 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'API Key limit reached for your current subscription'
                    })
                }
            } else if (resource === 'domains') {
                if (usage.remaining_domain <= 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'Domain limit reached for your current subscription'
                    })
                }
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

module.exports = subscriptionMiddleware
