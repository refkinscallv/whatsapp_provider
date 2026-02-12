'use strict'

const whatsappService = require('@app/services/whatsapp.service')
const messageQueueService = require('@app/services/messageQueue.service')
const subscriptionService = require('@app/services/subscription.service')
const db = require('@core/database.core')

/**
 * Message Controller
 * Handles message sending and history
 */
class MessageController {
    /**
     * Determine if a message should be queued based on user role and subscription
     * @private
     */
    async #checkShouldQueue(user, useQueue) {
        // Handle string booleans from FormData or other clients
        const normalizedUseQueue = useQueue === true || useQueue === 'true'

        // Super Admin respects choice
        if (user.role === 'SUPER_ADMIN') {
            return normalizedUseQueue
        }

        // Check active subscription
        const subscription = await db.models.UserSubscription.findOne({
            where: { user_token: user.token, status: 'ACTIVE' },
            include: [{ model: db.models.Package, as: 'package' }]
        })

        const packageName = subscription?.package?.name?.toUpperCase() || 'FREE'

        // Members with FREE plan are FORCED to use queue
        if (packageName === 'FREE') {
            return true
        }

        // Pro/Enterprise respect choice
        return normalizedUseQueue
    }

    /**
     * Send a single message
     * POST /api/messages/send
     */
    async send({ req, res }) {
        try {
            const { device_token, to, message, use_queue = true } = req.body

            if (!device_token || !to || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'device_token, to, and message are required',
                })
            }

            // Check if user has access to device
            const userDevice = await db.models.UserDevice.findOne({
                where: {
                    user_token: req.user.token,
                    device_token,
                },
            })

            if (!userDevice) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this device',
                })
            }

            // Get user subscription to determine priority if queued
            const subscription = await db.models.UserSubscription.findOne({
                where: { user_token: req.user.token, status: 'ACTIVE' },
                include: [{ model: db.models.Package, as: 'package' }]
            })
            const packageName = subscription?.package?.name || 'Free'
            const isFree = packageName === 'Free'

            // Determine if queue should be used based on role and plan
            const shouldQueue = await this.#checkShouldQueue(req.user, use_queue)

            if (shouldQueue) {
                // Add to queue
                const result = await messageQueueService.addToQueue({
                    device_token,
                    user_token: req.user.token,
                    to,
                    message,
                    type: 'text',
                    priority: isFree ? 'low' : 'normal',
                })

                return res.status(200).json(result)
            } else {
                // Send immediately
                const result = await whatsappService.sendMessage(device_token, to, message, { user_token: req.user.token })

                // Decrement usage
                await subscriptionService.decrementUsage(req.user.token, 'messages')

                return res.status(200).json(result)
            }
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Send bulk messages
     * POST /api/messages/bulk
     */
    async sendBulk({ req, res }) {
        try {
            const { device_token, recipients, use_queue = true, delay, min_delay, max_delay } = req.body

            if (!device_token || !recipients || !Array.isArray(recipients)) {
                return res.status(400).json({
                    success: false,
                    message: 'device_token and recipients array are required',
                })
            }

            // Check if user has access to device
            const userDevice = await db.models.UserDevice.findOne({
                where: {
                    user_token: req.user.token,
                    device_token,
                },
            })

            if (!userDevice) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this device',
                })
            }

            // Determine if queue should be used based on role and plan
            const shouldQueue = await this.#checkShouldQueue(req.user, use_queue)

            if (shouldQueue) {
                // Add all to queue
                const results = []
                for (const recipient of recipients) {
                    const result = await messageQueueService.addToQueue({
                        device_token,
                        user_token: req.user.token,
                        to: recipient.to,
                        message: recipient.message,
                        type: 'text',
                        priority: 'normal',
                        metadata: {
                            delay,
                            min_delay,
                            max_delay
                        }
                    })
                    results.push(result)
                }

                return res.status(200).json({
                    success: true,
                    message: `${results.length} messages added to queue`,
                    total: results.length,
                })
            } else {
                // Send immediately (bypass queue)
                // Get user delay settings from metadata
                let user = req.user
                if (req.user.is_api) {
                    user = await db.models.User.findOne({ where: { token: req.user.token } })
                }

                const userSettings = user?.metadata?.settings || {}
                let delay = parseInt(userSettings.queue_delay) * 1000
                if (isNaN(delay)) delay = parseInt(process.env.QUEUE_NORMAL_DELAY) || 1000

                // Enforce minimum 1s for safety
                delay = Math.max(delay, 1000)

                const result = await whatsappService.sendBulkMessages(device_token, recipients.map(r => ({ ...r, options: { user_token: req.user.token } })), delay)

                // Decrement usage for each recipient
                await subscriptionService.decrementUsage(req.user.token, 'messages', recipients.length)

                return res.status(200).json(result)
            }
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message,
            })
        }
    }

    async sendMedia({ req, res }) {
        try {
            // More robust data extraction from req.body (handles both JSON and FormData)
            const device_token = req.body.device_token
            const to = req.body.to
            let media_url = req.body.media_url
            const use_queue = req.body.use_queue !== 'false' && req.body.use_queue !== false
            const file = req.files?.file

            // Unified caption extraction (message or caption)
            const caption = req.body.message || req.body.caption || ''

            if (!device_token || !to) {
                return res.status(400).json({
                    success: false,
                    message: 'device_token and recipient (to) are required',
                })
            }

            // Handle file upload
            if (!media_url && file) {
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

                // Construct absolute public URL
                const baseUrl = config.app.url.replace(/\/$/, '')
                media_url = `${baseUrl}/uploads/media/${fileName}`
            }

            if (!media_url) {
                return res.status(400).json({
                    success: false,
                    message: 'media_url or file upload is required',
                })
            }

            // Check if user has access to device
            const userDevice = await db.models.UserDevice.findOne({
                where: {
                    user_token: req.user.token,
                    device_token,
                },
            })

            if (!userDevice) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this device',
                })
            }

            // Determine if queue should be used based on role and plan
            const shouldQueue = await this.#checkShouldQueue(req.user, use_queue)

            if (shouldQueue) {
                // Add to queue
                const result = await messageQueueService.addToQueue({
                    device_token,
                    user_token: req.user.token,
                    to,
                    message: caption,
                    type: 'image',
                    media_url,
                    priority: 'normal',
                })

                return res.status(200).json(result)
            } else {
                // Send immediately
                const result = await whatsappService.sendMediaMessage(device_token, to, { url: media_url, user_token: req.user.token }, caption)

                // Decrement usage
                await subscriptionService.decrementUsage(req.user.token, 'messages')

                return res.status(200).json(result)
            }
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Get message history
     * GET /api/messages/history
     */
    async getHistory({ req, res }) {
        try {
            const { device_token, to, status, limit = 50, offset = 0 } = req.query
            const { Op } = db

            let where = {}

            if (device_token) {
                // Check if user has access to specific device
                const userDevice = await db.models.UserDevice.findOne({
                    where: {
                        user_token: req.user.token,
                        device_token,
                    },
                })

                if (!userDevice) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have access to this device',
                    })
                }
                where.device_token = device_token
            } else {
                // Get all user devices
                const userDevices = await db.models.UserDevice.findAll({
                    where: { user_token: req.user.token }
                })
                const deviceTokens = userDevices.map(ud => ud.device_token)
                where.device_token = { [Op.in]: deviceTokens }
            }

            if (to) {
                where.to = { [Op.like]: `%${to}%` }
            }

            if (status) {
                where.status = status
            }

            const history = await db.models.MessageHistory.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        model: db.models.User,
                        as: 'user',
                        attributes: ['name']
                    }
                ]
            })

            return res.status(200).json({
                success: true,
                total: history.count,
                messages: history.rows,
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Clear message history
     * DELETE /api/messages/history/clear
     */
    async clearHistory({ req, res }) {
        try {
            const userDevices = await db.models.UserDevice.findAll({
                where: { user_token: req.user.token }
            })
            const deviceTokens = userDevices.map(ud => ud.device_token)

            await db.models.MessageHistory.destroy({
                where: {
                    device_token: { [db.Op.in]: deviceTokens }
                }
            })

            return res.status(200).json({
                success: true,
                message: 'Message history cleared successfully'
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Get queue statistics
     * GET /api/messages/queue/stats
     */
    async getQueueStats({ req, res }) {
        try {
            const stats = await messageQueueService.getQueueStats(req.user.token)

            return res.status(200).json({
                success: true,
                stats,
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Get message history statistics
     * GET /api/messages/history/stats
     */
    async getHistoryStats({ req, res }) {
        try {
            const db = require('@core/database.core')
            const { Op } = db.Sequelize
            const now = new Date()
            const last30d = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))

            const [total, success, failed] = await Promise.all([
                db.models.MessageHistory.count({
                    where: {
                        user_token: req.user.token,
                        createdAt: { [Op.gte]: last30d }
                    }
                }),
                db.models.MessageHistory.count({
                    where: {
                        user_token: req.user.token,
                        status: { [Op.in]: ['sent', 'delivered', 'read'] },
                        createdAt: { [Op.gte]: last30d }
                    }
                }),
                db.models.MessageHistory.count({
                    where: {
                        user_token: req.user.token,
                        status: 'failed',
                        createdAt: { [Op.gte]: last30d }
                    }
                })
            ])

            return res.status(200).json({
                success: true,
                stats: {
                    total_30d: total || 0,
                    success_30d: success || 0,
                    failed_30d: failed || 0,
                    success_rate: total > 0 ? Math.round((success / total) * 100) : 0
                }
            })
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message })
        }
    }
}

module.exports = MessageController
