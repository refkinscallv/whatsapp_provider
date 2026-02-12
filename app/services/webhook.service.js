'use strict'

const db = require('@core/database.core')
const Logger = require('@core/logger.core')
const axios = require('axios')
const crypto = require('crypto')
const Hash = require('@core/helpers/hash.helper')

/**
 * Webhook Service
 * Handles event notifications to external systems
 */
class WebhookService {
    /**
     * Create or update webhook configuration
     * @param {string} userToken - User token
     * @param {object} data - Webhook data
     * @returns {Promise<object>}
     */
    async saveWebhook(userToken, data) {
        const { id, device_token, url, events, secret, is_active } = data

        if (!url || !events) {
            throw new Error('URL and events are required')
        }

        let webhook
        if (id) {
            webhook = await db.models.Webhook.findOne({
                where: { id, user_token: userToken }
            })
            if (!webhook) throw new Error('Webhook not found')

            await webhook.update({ device_token, url, events, secret, is_active })
        } else {
            webhook = await db.models.Webhook.create({
                token: Hash.token(),
                user_token: userToken,
                device_token,
                url,
                events,
                secret: secret || crypto.randomBytes(16).toString('hex'),
                is_active: is_active !== undefined ? is_active : true
            })
        }

        return {
            success: true,
            webhook
        }
    }

    /**
     * Get user webhooks
     * @param {string} userToken - User token
     * @returns {Promise<Array>}
     */
    async getWebhooks(userToken) {
        return await db.models.Webhook.findAll({
            where: { user_token: userToken },
            include: [{
                model: db.models.Device,
                as: 'device',
                attributes: ['name', 'whatsapp', 'token']
            }],
            order: [['createdAt', 'DESC']]
        })
    }

    /**
     * Delete webhook
     * @param {string} userToken - User token
     * @param {string} token - Webhook token
     * @returns {Promise<object>}
     */
    async deleteWebhook(userToken, token) {
        const result = await db.models.Webhook.destroy({
            where: { token, user_token: userToken }
        })

        if (!result) throw new Error('Webhook not found')

        return {
            success: true,
            message: 'Webhook configuration deleted'
        }
    }

    /**
     * Notify webhooks about an event
     * @param {string} deviceToken - Device token triggering the event
     * @param {string} event - Event name
     * @param {object} payload - Event data
     */
    async notify(deviceToken, event, payload) {
        try {
            // Find active webhooks for this device OR global webhooks for the device owner
            // First, find the owner of the device
            const deviceOwner = await db.models.UserDevice.findOne({
                where: { device_token: deviceToken, is_host: true }
            })

            if (!deviceOwner) return

            const webhooks = await db.models.Webhook.findAll({
                where: {
                    user_token: deviceOwner.user_token,
                    is_active: true,
                    // Either matches device token specifically or is global for that user
                }
            })

            for (const webhook of webhooks) {
                // Check if this webhook is interested in this event
                let interestedEvents = []
                if (Array.isArray(webhook.events)) {
                    interestedEvents = webhook.events
                } else if (typeof webhook.events === 'string') {
                    interestedEvents = webhook.events.split(',').map(e => e.trim())
                }

                if (!interestedEvents.includes(event) && !interestedEvents.includes('*')) continue

                // Check device token specific filter
                if (webhook.device_token && webhook.device_token !== deviceToken) continue

                // Send notification asynchronously
                this.sendPayload(webhook, event, payload)
            }
        } catch (err) {
            Logger.error('Error in webhook notify logic', err)
        }
    }

    /**
     * Send payload to a specific webhook
     * @param {object} webhook - Webhook model instance
     * @param {string} event - Event name
     * @param {object} payload - Paylod data
     */
    async sendPayload(webhook, event, payload) {
        const data = {
            id: crypto.randomBytes(8).toString('hex'),
            event,
            timestamp: new Date().toISOString(),
            data: payload
        }

        // Generate signature if secret exists
        const headers = { 'Content-Type': 'application/json' }
        if (webhook.secret) {
            const signature = crypto
                .createHmac('sha256', webhook.secret)
                .update(JSON.stringify(data))
                .digest('hex')
            headers['X-WF-Signature'] = signature
        }

        try {
            await axios.post(webhook.url, data, { headers, timeout: 5000 })
            Logger.debug(`Webhook sent successfully: ${webhook.url} for event ${event}`)
        } catch (err) {
            Logger.warn(`Webhook failed: ${webhook.url}. Status: ${err.response?.status}. Message: ${err.message}`)
            // You can implement retry logic here using a job queue
        }
    }
}

module.exports = new WebhookService()
