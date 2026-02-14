'use strict'

const db = require('@core/database.core')
const { Op } = db
const Logger = require('@core/logger.core')
const Hash = require('@core/helpers/hash.helper')

/**
 * Campaign Service
 * Handles broadcast campaigns and progress tracking
 */
class CampaignService {
    /**
     * Create a new campaign
     * @param {string} userToken - User token
     * @param {object} data - Campaign data
     * @returns {Promise<object>}
     */
    async createCampaign(userToken, data) {
        let { device_token, name, receivers, message, type = 'text', media_url, media_mimetype, scheduled_at, book_id, min_delay, max_delay, delay } = data

        // If delay is provided but not min/max, use it for both
        if (delay && !min_delay && !max_delay) {
            min_delay = delay
            max_delay = delay
        }

        // Resolve receivers from book_id if provided
        if (book_id && !receivers) {
            const book = await db.models.ContactBook.findOne({
                where: { id: book_id, user_token: userToken }
            })

            if (book) {
                let contacts = book.contacts
                // Handle potential stringified JSON
                if (typeof contacts === 'string') {
                    try { contacts = JSON.parse(contacts) } catch (e) { contacts = [] }
                }

                if (Array.isArray(contacts) && contacts.length > 0) {
                    receivers = contacts.map(c => c.phone || c.whatsapp).filter(Boolean)
                } else {
                    throw new Error(`Contact book "${book.name}" is empty or has no valid contacts`)
                }
            } else {
                throw new Error('Selected contact book not found')
            }
        }

        if (!name || !receivers || !message || !device_token) {
            throw new Error('Name, device token, receivers, and message are required')
        }

        // Parse receivers (can be array or comma-separated string)
        const receiverList = Array.isArray(receivers)
            ? receivers
            : (typeof receivers === 'string' ? receivers.split(/,|\n/).map(r => r.trim()).filter(Boolean) : [])

        if (receiverList.length === 0) {
            throw new Error('No valid receivers found for this campaign')
        }

        const campaign = await db.models.Campaign.create({
            token: Hash.token(),
            user_token: userToken,
            device_token,
            name,
            message,
            type,
            media_url,
            media_mimetype,
            total_recipients: receiverList.length,
            sent_count: 0,
            failed_count: 0,
            status: scheduled_at ? 'scheduled' : 'running',
            scheduled_at: scheduled_at || new Date(),
            target_audience: receiverList,
            settings: {
                min_delay: parseInt(min_delay) || 2,
                max_delay: parseInt(max_delay) || 5
            }
        })

        // If not scheduled, start processing immediately
        if (!scheduled_at) {
            this.processCampaign(campaign, receiverList, message, type, media_url, media_mimetype)
        }

        return {
            success: true,
            campaign
        }
    }

    /**
     * Process campaign by adding messages to queue
     * @param {object} campaign - Campaign model instance
     * @param {Array} receivers - List of recipients
     * @param {string} message - Message text
     * @param {string} type - Message type
     * @param {string} media_url - Media URL
     */
    async processCampaign(campaign, receivers, message, type, media_url, media_mimetype = null) {
        try {
            Logger.info(`Processing campaign: ${campaign.name} (${campaign.token})`)
            const { min_delay, max_delay } = campaign.settings || {}

            // Lazy-load to avoid circular dependency
            const messageQueueService = require('./messageQueue.service')

            for (const receiver of receivers) {
                // Add to message queue with campaign reference in metadata
                await messageQueueService.addToQueue({
                    device_token: campaign.device_token,
                    user_token: campaign.user_token,
                    to: receiver,
                    message,
                    type,
                    media_url,
                    media_mimetype,
                    priority: 'low', // Campaigns are usually low priority
                    metadata: {
                        campaign_token: campaign.token,
                        min_delay,
                        max_delay
                    }
                })
            }

            // Update status to running
            await campaign.update({ status: 'running', started_at: new Date() })
        } catch (err) {
            Logger.error(`Error processing campaign ${campaign.token}`, err)
            await campaign.update({ status: 'cancelled' })
            throw err
        }
    }

    /**
     * Get user campaigns
     * @param {string} userToken - User token
     * @returns {Promise<Array>}
     */
    async getCampaigns(userToken) {
        return await db.models.Campaign.findAll({
            where: { user_token: userToken },
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: db.models.User,
                    as: 'user',
                    attributes: ['name']
                }
            ]
        })
    }

    /**
     * Get campaign details and stats
     * @param {string} userToken - User token
     * @param {string} token - Campaign token
     * @returns {Promise<object>}
     */
    async getCampaign(userToken, token) {
        const campaign = await db.models.Campaign.findOne({
            where: { token, user_token: userToken },
            include: [
                {
                    model: db.models.User,
                    as: 'user',
                    attributes: ['name']
                },
                {
                    model: db.models.Device,
                    as: 'device',
                    attributes: ['name', 'token']
                }
            ]
        })

        if (!campaign) throw new Error('Campaign not found')

        return campaign
    }

    /**
     * Update campaign stats (called by MessageQueue when a message related to this campaign is processed)
     * @param {string} campaignToken - Campaign token
     * @param {boolean} success - Whether the message was sent successfully
     */
    async updateStats(campaignToken, success) {
        const campaign = await db.models.Campaign.findOne({ where: { token: campaignToken } })
        if (!campaign) return

        if (success) {
            await campaign.increment('sent_count')
        } else {
            await campaign.increment('failed_count')
        }

        // Check completion
        const updated = await campaign.reload()
        if (updated.sent_count + updated.failed_count >= updated.total_recipients) {
            await campaign.update({ status: 'completed', completed_at: new Date() })
        }

        // Emit realtime update via Socket.IO
        try {
            const Socket = require('@core/socket.core')
            const io = Socket.getInstance()
            if (io) {
                io.to(`user:${campaign.user_token}`).emit('campaign:update', {
                    token: campaign.token,
                    sent_count: updated.sent_count,
                    failed_count: updated.failed_count,
                    total_recipients: updated.total_recipients,
                    status: updated.status
                })
            }
        } catch (err) {
            Logger.warn('Failed to emit campaign update via Socket.IO', err)
        }
    }

    /**
     * Process scheduled campaigns that are ready to run
     * @returns {Promise<object>}
     */
    async processScheduledCampaigns() {
        const now = new Date()
        try {
            const pendingCampaigns = await db.models.Campaign.findAll({
                where: {
                    status: 'scheduled',
                    scheduled_at: {
                        [Op.lte]: now
                    }
                }
            })

            const count = pendingCampaigns.length
            if (count > 0) {
                Logger.info(`Found ${count} scheduled campaigns to process.`)
                for (const campaign of pendingCampaigns) {
                    const receivers = campaign.target_audience
                    if (receivers && Array.isArray(receivers)) {
                        await this.processCampaign(campaign, receivers, campaign.message, campaign.type, campaign.media_url, campaign.media_mimetype)
                    } else {
                        Logger.warn(`Campaign ${campaign.token} is scheduled but has no recipient data in target_audience.`)
                        await campaign.update({ status: 'failed' })
                    }
                }
            }
            return { success: true, processedCount: count }
        } catch (err) {
            Logger.error('Error processing scheduled campaigns', err)
            throw err
        }
    }

    /**
     * Delete a campaign
     * @param {string} userToken - User token
     * @param {string} token - Campaign token
     * @returns {Promise<object>}
     */
    async deleteCampaign(userToken, token) {
        const result = await db.models.Campaign.destroy({
            where: { token, user_token: userToken }
        })

        if (!result) throw new Error('Campaign not found')

        Logger.info(`Campaign deleted: ${token}`)

        return {
            success: true,
            message: 'Campaign deleted successfully'
        }
    }

    /**
     * Get campaign statistics for a user
     * @param {string} userToken - User token
     * @returns {Promise<object>}
     */
    async getStats(userToken) {
        const now = new Date()
        const last30d = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))

        const [active, sent30d, failed30d] = await Promise.all([
            db.models.Campaign.count({
                where: { user_token: userToken, status: 'running' }
            }),
            db.models.Campaign.sum('sent_count', {
                where: {
                    user_token: userToken,
                    createdAt: { [Op.gte]: last30d }
                }
            }),
            db.models.Campaign.sum('failed_count', {
                where: {
                    user_token: userToken,
                    createdAt: { [Op.gte]: last30d }
                }
            })
        ])

        return {
            active: active || 0,
            sent_30d: sent30d || 0,
            failed_30d: failed30d || 0
        }
    }
}

module.exports = new CampaignService()
