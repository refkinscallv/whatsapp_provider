'use strict'

const webhookService = require('@app/services/webhook.service')

/**
 * Webhook Controller
 * Handles webhook configuration management
 */
class WebhookController {
    /**
     * Get user webhooks
     * GET /api/webhooks
     */
    async getAll({ req, res }) {
        try {
            const webhooks = await webhookService.getWebhooks(req.user.token)
            return res.status(200).json({
                success: true,
                webhooks
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Save webhook configuration (create or update)
     * POST /api/webhooks
     */
    async save({ req, res }) {
        try {
            const result = await webhookService.saveWebhook(req.user.token, req.body)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Delete webhook configuration
     * DELETE /api/webhooks/:id
     */
    async delete({ req, res }) {
        try {
            const { token } = req.params
            const result = await webhookService.deleteWebhook(req.user.token, token)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }
}

module.exports = WebhookController
