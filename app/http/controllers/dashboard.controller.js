'use strict'

const dashboardService = require('@app/services/dashboard.service')

/**
 * Dashboard Controller
 * Handles usage statistics and overview requests
 */
class DashboardController {
    /**
     * Get dashboard overview
     * GET /api/dashboard
     */
    async getOverview({ req, res }) {
        try {
            const stats = await dashboardService.getStats(req.user)
            const recent = await dashboardService.getRecentHistory(req.user)

            return res.status(200).json({
                success: true,
                stats,
                recent
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }
}

module.exports = DashboardController
