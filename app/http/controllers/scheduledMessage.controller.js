'use strict'

const scheduledMessageService = require('@app/services/scheduledMessage.service')

/**
 * Scheduled Message Controller
 * Handles scheduled message management endpoints
 */
class ScheduledMessageController {
    /**
     * Create a new scheduled message
     * POST /api/scheduled-messages
     */
    async create({ req, res }) {
        try {
            const data = req.body
            const file = req.files?.file

            // Handle file upload
            if (file) {
                const path = require('path')
                const fs = require('fs')
                const Hash = require('@core/helpers/hash.helper')
                const config = require('@app/config')

                const uploadDir = path.join(config.express.static.path, 'uploads/media')
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true })
                }

                const fileName = `${Date.now()}-${Hash.token(8)}${path.extname(file.name)}`
                const filePath = path.join(uploadDir, fileName)

                await file.mv(filePath)

                const baseUrl = config.app.url.replace(/\/$/, '')
                data.media_url = `${baseUrl}/uploads/media/${fileName}`
                data.type = 'image'
            }

            const result = await scheduledMessageService.createBulkScheduledMessages(req.user.token, data)
            return res.status(201).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Get all scheduled messages
     * GET /api/scheduled-messages
     */
    async getAll({ req, res }) {
        try {
            const { status, device_token } = req.query
            const scheduledMessages = await scheduledMessageService.getScheduledMessages(
                req.user.token,
                { status, device_token }
            )
            return res.status(200).json({
                success: true,
                scheduledMessages
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Get scheduled message by token
     * GET /api/scheduled-messages/:token
     */
    async getOne({ req, res }) {
        try {
            const { token } = req.params
            const scheduledMessage = await scheduledMessageService.getScheduledMessage(req.user.token, token)
            return res.status(200).json({
                success: true,
                scheduledMessage
            })
        } catch (err) {
            return res.status(404).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Cancel a scheduled message
     * PUT /api/scheduled-messages/:token/cancel
     */
    async cancel({ req, res }) {
        try {
            const { token } = req.params
            const result = await scheduledMessageService.cancelScheduledMessage(req.user.token, token)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Delete a scheduled message
     * DELETE /api/scheduled-messages/:token
     */
    async delete({ req, res }) {
        try {
            const { token } = req.params
            const result = await scheduledMessageService.deleteScheduledMessage(req.user.token, token)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Get scheduled message statistics
     * GET /api/scheduled-messages/stats
     */
    async getStats({ req, res }) {
        try {
            const stats = await scheduledMessageService.getStats(req.user.token)
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

module.exports = ScheduledMessageController
