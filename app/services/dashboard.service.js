'use strict'

const db = require('@core/database.core')
const { Op } = require('sequelize')

/**
 * Dashboard Service
 * Provides statistics and overview data
 */
class DashboardService {
    /**
     * Get dashboard statistics
     * @param {object} user - User object from request
     * @returns {Promise<object>}
     */
    async getStats(user) {
        const isAdmin = user.role === 'SUPER_ADMIN'
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        let deviceTokens = []
        let deviceCount = 0
        let campaignCount = 0

        if (isAdmin) {
            // System-wide stats for admin
            deviceCount = await db.models.Device.count({
                where: { is_deleted: false }
            })
            campaignCount = await db.models.Campaign.count({ where: { status: 'running' } })
        } else {
            // User-specific stats
            const userDevices = await db.models.UserDevice.findAll({
                where: { user_token: user.token },
                include: [{
                    model: db.models.Device,
                    as: 'device',
                    where: { is_deleted: false }, // Crucial: Only active devices
                    required: true
                }],
                attributes: ['device_token']
            })
            deviceTokens = userDevices.map(ud => ud.device_token)
            deviceCount = deviceTokens.length
            campaignCount = await db.models.Campaign.count({
                where: { user_token: user.token, status: 'running' }
            })
        }

        // Message Stats
        let messageStats = [{ total: 0, success: 0, failed: 0 }]
        const messageWhere = { createdAt: { [Op.gte]: thirtyDaysAgo } }
        if (!isAdmin) {
            if (deviceTokens.length > 0) {
                messageWhere.device_token = { [Op.in]: deviceTokens }
            } else {
                // No devices, force 0 results
                messageWhere.device_token = 'null'
            }
        }

        messageStats = await db.models.MessageHistory.findAll({
            where: messageWhere,
            attributes: [
                [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'total'],
                [db.Sequelize.literal("SUM(CASE WHEN status = 'sent' OR status = 'delivered' OR status = 'read' THEN 1 ELSE 0 END)"), 'success'],
                [db.Sequelize.literal("SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)"), 'failed']
            ],
            raw: true
        })

        // Subscription/Limits
        const subscription = await db.models.UserSubscription.findOne({
            where: { user_token: user.token, status: 'active' },
            include: [{ model: db.models.Package, as: 'package' }]
        })

        let usage = null
        if (subscription) {
            usage = await db.models.UserSubscriptionUsage.findOne({
                where: { subscription_token: subscription.token }
            })
        }

        return {
            devices: {
                total: deviceCount,
                limit: isAdmin ? '∞' : (subscription?.package?.limit_device || 0),
                remaining: isAdmin ? '∞' : (usage ? usage.remaining_device : 0)
            },
            messages: {
                total_30d: parseInt(messageStats[0]?.total || 0),
                success_30d: parseInt(messageStats[0]?.success || 0),
                failed_30d: parseInt(messageStats[0]?.failed || 0),
                limit: isAdmin ? '∞' : (subscription?.package?.limit_message || 0),
                remaining: isAdmin ? '∞' : (usage ? usage.remaining_message : 0)
            },
            campaigns: {
                active: campaignCount
            },
            subscription: isAdmin ? {
                package_name: 'SUPER ADMIN',
                ends_at: '2099-12-31'
            } : (subscription ? {
                package_name: subscription.package.name,
                ends_at: subscription.ends_at
            } : null)
        }
    }

    /**
     * Get recent message history
     * @param {object} user - User object
     * @param {number} limit - Number of records
     * @returns {Promise<Array>}
     */
    async getRecentHistory(user, limit = 10) {
        const isAdmin = user.role === 'SUPER_ADMIN'
        const where = {}

        if (!isAdmin) {
            const userDevices = await db.models.UserDevice.findAll({
                where: { user_token: user.token },
                include: [{
                    model: db.models.Device,
                    as: 'device',
                    where: { is_deleted: false },
                    required: true
                }],
                attributes: ['device_token']
            })
            const deviceTokens = userDevices.map(ud => ud.device_token)
            if (deviceTokens.length === 0) return []
            where.device_token = { [Op.in]: deviceTokens }
        }

        return await db.models.MessageHistory.findAll({
            where,
            limit,
            order: [['createdAt', 'DESC']]
        })
    }
}

module.exports = new DashboardService()
