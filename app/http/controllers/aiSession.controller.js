'use strict'

const aiSessionService = require('@app/services/aiSession.service')

/**
 * AI Session Controller
 * Handles AI automation session management
 */
class AiSessionController {
    /**
     * Render AI Sessions page
     * GET /ai-sessions
     */
    async index({ req, res }) {
        const config = require('@app/config')
        res.render('ai-sessions/index', {
            user: req.user,
            userToken: req.user.token,
            isSubscriptionEnabled: config.subscription?.enabled || false
        })
    }

    /**
     * Create a new AI session
     * POST /api/ai-sessions
     */
    async create({ req, res }) {
        try {
            const data = req.body
            const result = await aiSessionService.createSession(req.user.token, data)
            return res.status(201).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Get all AI sessions
     * GET /api/ai-sessions
     */
    async getAll({ req, res }) {
        try {
            const sessions = await aiSessionService.getUserSessions(req.user.token)
            return res.status(200).json({
                success: true,
                sessions
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Get AI session by token
     * GET /api/ai-sessions/:token
     */
    async getOne({ req, res }) {
        try {
            const { token } = req.params
            const session = await aiSessionService.getSession(token)

            // Check if user owns this session
            if (session.user_token !== req.user.token) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                })
            }

            return res.status(200).json({
                success: true,
                session
            })
        } catch (err) {
            return res.status(404).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Update AI session
     * PUT /api/ai-sessions/:token
     */
    async update({ req, res }) {
        try {
            const { token } = req.params
            const data = req.body

            // Verify ownership
            const session = await aiSessionService.getSession(token)
            if (session.user_token !== req.user.token) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                })
            }

            const result = await aiSessionService.updateSession(token, data)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Delete AI session
     * DELETE /api/ai-sessions/:token
     */
    async delete({ req, res }) {
        try {
            const { token } = req.params

            // Verify ownership
            const session = await aiSessionService.getSession(token)
            if (session.user_token !== req.user.token) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                })
            }

            const result = await aiSessionService.deleteSession(token)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Get AI session statistics
     * GET /api/ai-sessions/stats
     */
    async getStats({ req, res }) {
        try {
            const stats = await aiSessionService.getStats(req.user.token)
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

module.exports = AiSessionController
