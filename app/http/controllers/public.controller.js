'use strict'

const db = require('@core/database.core')

/**
 * Public Controller
 * Handles unauthenticated API requests for landing page and other public views
 */
class PublicController {
    /**
     * Get system-wide statistics for landing page
     * @returns {Promise<object>}
     */
    async getStats({ res }) {
        try {
            const counts = {
                users: await db.models.User.count(),
                devices: await db.models.Device.count(),
                messages: await db.models.MessageHistory.count()
            }

            return res.json({
                success: true,
                stats: counts
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch statistics'
            })
        }
    }
}

module.exports = PublicController
