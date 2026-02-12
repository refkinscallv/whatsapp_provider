'use strict'

const autoReplyService = require('@app/services/autoReply.service')

/**
 * Auto-Reply Controller
 * Handles bot auto-reply rule management
 */
class AutoReplyController {
    /**
     * Create a new rule
     * POST /api/auto-replies
     */
    async create({ req, res }) {
        try {
            const result = await autoReplyService.createRule(req.user.token, req.body)
            return res.status(201).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Get all rules
     * GET /api/auto-replies
     */
    async getAll({ req, res }) {
        try {
            const { device_token } = req.query
            const rules = await autoReplyService.getRules(req.user.token, device_token)
            return res.status(200).json({
                success: true,
                rules
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Update rule
     * PUT /api/auto-replies/:token
     */
    async update({ req, res }) {
        try {
            const { token } = req.params
            const result = await autoReplyService.updateRule(req.user.token, token, req.body)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Delete rule
     * DELETE /api/auto-replies/:token
     */
    async delete({ req, res }) {
        try {
            const { token } = req.params
            const result = await autoReplyService.deleteRule(req.user.token, token)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Get auto-reply statistics
     * GET /api/auto-replies/stats
     */
    async getStats({ req, res }) {
        try {
            const stats = await autoReplyService.getStats(req.user.token)
            return res.status(200).json({
                success: true,
                stats
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }
}

module.exports = AutoReplyController
