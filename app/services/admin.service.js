'use strict'

const db = require('@core/database.core')
const { Op } = db

/**
 * Admin Service
 * Provides global analytics and system management data
 */
class AdminService {
    /**
     * Get global system statistics
     * @returns {Promise<object>}
     */
    async getGlobalStats() {
        const now = new Date()
        const last24h = new Date(now.getTime() - (24 * 60 * 60 * 1000))

        const [
            totalUsers,
            activeUsers,
            totalDevices,
            readyDevices,
            totalMessages,
            messages24h,
            failed24h,
            activeCampaigns
        ] = await Promise.all([
            db.models.User.count(),
            db.models.User.count({ where: { status: 'ACTIVE' } }),
            db.models.Device.count(),
            db.models.Device.count({ where: { status: 'ready' } }),
            db.models.MessageHistory.count(),
            db.models.MessageHistory.count({
                where: {
                    createdAt: { [Op.gte]: last24h },
                    status: { [Op.in]: ['sent', 'delivered', 'read'] }
                }
            }),
            db.models.MessageHistory.count({
                where: {
                    createdAt: { [Op.gte]: last24h },
                    status: 'failed'
                }
            }),
            db.models.Campaign.count({ where: { status: 'running' } })
        ])

        return {
            users: {
                total: totalUsers,
                active: activeUsers
            },
            devices: {
                total: totalDevices,
                ready: readyDevices
            },
            messages: {
                total: totalMessages,
                sent_24h: messages24h,
                failed_24h: failed24h
            },
            campaigns: {
                active: activeCampaigns
            }
        }
    }
}

module.exports = new AdminService()
