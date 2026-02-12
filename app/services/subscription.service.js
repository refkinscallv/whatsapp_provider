'use strict'

const db = require('@core/database.core')
const Logger = require('@core/logger.core')
const { Op } = require('sequelize')
const dayjs = require('dayjs')

/**
 * Subscription Service
 * Handles user subscriptions and expiry checks
 */
class SubscriptionService {
    /**
     * Check for expired subscriptions and update status
     * @returns {Promise<object>}
     */
    async checkExpirations() {
        const now = new Date()

        try {
            // Find active subscriptions that have passed their end date
            const expiredSubscriptions = await db.models.UserSubscription.findAll({
                where: {
                    status: 'active',
                    ends_at: {
                        [Op.lt]: now
                    }
                }
            })

            const count = expiredSubscriptions.length
            if (count > 0) {
                Logger.info(`Found ${count} expired subscriptions. Processing...`)

                for (const sub of expiredSubscriptions) {
                    await sub.update({ status: 'expired' })

                    // Log usage reset or other actions if needed
                    Logger.info(`Subscription ${sub.token} for user ${sub.user_token} has expired.`)
                }
            }

            return { success: true, expiredCount: count }
        } catch (err) {
            Logger.error('Error checking subscription expirations', err)
            throw err
        }
    }

    /**
     * Get active subscription for a user
     * @param {string} userToken - User token
     * @returns {Promise<object>}
     */
    async getActiveSubscription(userToken) {
        return await db.models.UserSubscription.findOne({
            where: {
                user_token: userToken,
                status: 'active',
                ends_at: {
                    [Op.gt]: new Date()
                }
            },
            include: [{ model: db.models.Package, as: 'package' }]
        })
    }

    /**
     * Decrement usage for a specific resource
     * @param {string} userToken - User token
     * @param {string} resource - Resource type (messages, devices, etc.)
     * @param {number} amount - Amount to decrement
     * @returns {Promise<boolean>}
     */
    async decrementUsage(userToken, resource, amount = 1) {
        try {
            // Find user to check role
            const user = await db.models.User.findOne({ where: { token: userToken } })
            if (!user || user.role === 'SUPER_ADMIN') return true

            const columnMap = {
                messages: 'remaining_message',
                devices: 'remaining_device',
                api_keys: 'remaining_api_key',
                domains: 'remaining_domain'
            }

            const column = columnMap[resource]
            if (!column) return false

            const usage = await db.models.UserSubscriptionUsage.findOne({
                where: { user_token: userToken }
            })

            if (!usage) return false

            // Decrement
            await usage.decrement(column, { by: amount })
            return true
        } catch (err) {
            Logger.error(`Failed to decrement usage for ${userToken}`, err)
            return false
        }
    }

    /**
     * Initialize usage for a new subscription
     * @param {string} userToken - User token
     * @param {string} subscriptionToken - Subscription token
     * @param {object} pkg - Package model instance
     */
    async initializeUsage(userToken, subscriptionToken, pkg) {
        try {
            await db.models.UserSubscriptionUsage.upsert({
                user_token: userToken,
                subscription_token: subscriptionToken,
                remaining_device: pkg.limit_device || 0,
                remaining_message: pkg.limit_message || 0,
                remaining_api_key: pkg.limit_generate_api_key || 0,
                remaining_domain: pkg.limit_domain_whitelist || 0,
                last_reset_at: new Date()
            })
        } catch (err) {
            Logger.error(`Failed to initialize usage for ${userToken}`, err)
        }
    }

    /**
     * Process Quota Resets based on package period
     * Should be run periodically (e.g. daily cron)
     */
    async processQuotaResets() {
        try {
            const activeSubscriptions = await db.models.UserSubscription.findAll({
                where: { status: 'active' },
                include: [
                    { model: db.models.Package, as: 'package' },
                    { model: db.models.UserSubscriptionUsage, as: 'usage' }
                ]
            })

            const now = dayjs()
            let resetCount = 0

            for (const sub of activeSubscriptions) {
                if (!sub.usage || !sub.package) continue

                const period = sub.package.period // DAILY, MONTHLY, YEARLY
                const lastReset = sub.usage.last_reset_at ? dayjs(sub.usage.last_reset_at) : dayjs(sub.started_at)
                let shouldReset = false

                if (period === 'DAILY') {
                    if (now.diff(lastReset, 'day') >= 1) shouldReset = true
                } else if (period === 'MONTHLY') {
                    if (now.diff(lastReset, 'month') >= 1) shouldReset = true
                } else if (period === 'YEARLY') {
                    if (now.diff(lastReset, 'year') >= 1) shouldReset = true
                }

                if (shouldReset) {
                    await sub.usage.update({
                        remaining_message: sub.package.limit_message,
                        last_reset_at: now.toDate()
                    })
                    resetCount++
                    Logger.info(`Reset quota for subscription ${sub.token} (User: ${sub.user_token})`)
                }
            }

            return { success: true, resetCount }
        } catch (err) {
            Logger.error('Error processing quota resets', err)
            throw err
        }
    }
}

module.exports = new SubscriptionService()
