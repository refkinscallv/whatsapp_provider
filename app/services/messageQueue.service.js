'use strict'

const db = require('@core/database.core')
const { Op } = db
const whatsappService = require('./whatsapp.service')
const campaignService = require('./campaign.service')
const subscriptionService = require('./subscription.service')
const Hash = require('@core/helpers/hash.helper')
const Logger = require('@core/logger.core')
const Socket = require('@core/socket.core')

/**
 * Message Queue Service
 * Handles message queuing with priority (free, premium)
 */
class MessageQueueService {
    constructor() {
        /**
         * Processing locks to prevent concurrent runs for the same device
         * Map<deviceToken, boolean>
         */
        this.processingLocks = new Map()

        /**
         * Burst Tracking
         * Map<deviceToken, { count: number, lastMsgTime: number, coolingDownUntil: number }>
         */
        this.burstTracker = new Map()

        /**
         * In-memory cache for user settings to avoid N+1 DB queries.
         * Map<userToken, { settings: object, expiresAt: number }>
         */
        this._userSettingsCache = new Map()
        this._USER_SETTINGS_TTL = 5 * 60 * 1000 // 5 minutes

        // Periodically clean up stale burstTracker and cache entries to prevent memory leaks
        setInterval(() => this._cleanupMemory(), 10 * 60 * 1000) // every 10 minutes
    }

    /**
     * Fetch user settings with in-memory TTL cache to avoid N+1 queries.
     * @param {string} userToken
     * @returns {Promise<object>}
     */
    async _getUserSettings(userToken) {
        const now = Date.now()
        const cached = this._userSettingsCache.get(userToken)
        if (cached && cached.expiresAt > now) {
            return cached.settings
        }
        const user = await db.models.User.findOne({
            where: { token: userToken },
            attributes: ['metadata']
        })
        const settings = user?.metadata?.settings || {}
        this._userSettingsCache.set(userToken, { settings, expiresAt: now + this._USER_SETTINGS_TTL })
        return settings
    }

    /**
     * Cleanup stale burstTracker entries and expired user settings cache entries.
     * Called every 10 minutes. Prevents memory leaks for inactive devices.
     */
    _cleanupMemory() {
        const now = Date.now()
        const INACTIVITY_THRESHOLD = 30 * 60 * 1000 // 30 minutes

        for (const [token, tracker] of this.burstTracker.entries()) {
            if (now - tracker.lastMsgTime > INACTIVITY_THRESHOLD) {
                this.burstTracker.delete(token)
            }
        }
        for (const [token, cached] of this._userSettingsCache.entries()) {
            if (cached.expiresAt < now) {
                this._userSettingsCache.delete(token)
            }
        }
        Logger.debug('queue', `Memory cleanup done. burstTracker: ${this.burstTracker.size}, settingsCache: ${this._userSettingsCache.size}`)
    }

    /**
     * Add message to queue
     * @param {object} data - Message data
     * @returns {Promise<object>}
     */
    async addToQueue(data) {
        const {
            device_token,
            user_token,
            to,
            message,
            type = 'text',
            media_url = null,
            media_mimetype = null,
            priority = 'normal',
            metadata = {},
            scheduled_at = new Date(),
        } = data

        const queueItem = await db.models.MessageQueue.create({
            token: Hash.token(),
            device_token,
            user_token,
            to,
            message,
            type,
            media_url,
            media_mimetype,
            status: 'queued',
            priority,
            scheduled_at,
            metadata,
        })

        // Decrement usage
        await subscriptionService.decrementUsage(user_token, 'messages')

        // Emit real-time update
        const io = Socket.getInstance()
        if (io) {
            io.to(`user:${user_token}`).emit('queue:update', { type: 'added' })
        }

        return {
            success: true,
            message: 'Message added to queue',
            queueToken: queueItem.token,
        }
    }

    /**
     * Process queued messages
     * @returns {Promise<object>}
     */
    async processQueue() {
        const now = new Date()

        try {
            // Fetch orphaned/stuck 'processing' messages (older than 5 minutes) and reset them
            await db.models.MessageQueue.update(
                { status: 'queued' },
                {
                    where: {
                        status: 'processing',
                        updatedAt: { [Op.lte]: new Date(now - 5 * 60 * 1000) }
                    }
                }
            )

            // Get 'queued' messages that are ready to be dispatched
            // We limit per device: find distinct devices with pending messages
            const pendingMessages = await db.models.MessageQueue.findAll({
                where: {
                    status: 'queued',
                    scheduled_at: { [Op.lte]: now },
                },
                attributes: ['device_token'],
                group: ['device_token'],
                raw: true,
            })

            if (pendingMessages.length === 0) return { dispatched: 0 }

            // For each device, kick off processNextForDevice ASYNCHRONOUSLY (non-blocking)
            // This is the key change: the cron job just dispatches, it does NOT await delays.
            let dispatched = 0
            for (const { device_token } of pendingMessages) {
                // Only dispatch if device is not already locked
                if (!this.processingLocks.get(device_token)) {
                    this.processNextForDevice(device_token).catch(err => {
                        Logger.error('queue', `Error dispatching processNextForDevice for ${device_token}: ${err.message}`)
                    })
                    dispatched++
                }
            }

            if (dispatched > 0) {
                Logger.info('queue', `Queue sweep dispatched ${dispatched} device(s) for processing.`)
            }

            return { dispatched }
        } catch (err) {
            Logger.error('queue', `Error in processQueue: ${err.message}`)
            throw err
        }
    }

    /**
     * Process the next available message for a specific device
     * This is triggered by events (message_create) for better cadence
     * @param {string} deviceToken 
     */
    async processNextForDevice(deviceToken) {
        // 1. Check lock
        if (this.processingLocks.get(deviceToken)) {
            Logger.debug('queue', `Device ${deviceToken} is already processing a message. Skipping event trigger.`)
            return
        }

        try {
            // 2. Set lock
            this.processingLocks.set(deviceToken, true)

            // 3. Find next message
            const now = new Date()
            const msg = await db.models.MessageQueue.findOne({
                where: {
                    device_token: deviceToken,
                    status: 'queued',
                    scheduled_at: { [Op.lte]: now }
                },
                order: [
                    ['priority', 'DESC'],
                    ['scheduled_at', 'ASC']
                ]
            })

            if (!msg) {
                return // Nothing to process
            }

            Logger.info('queue', `Event-driven: Processing next message for device ${deviceToken} (Msg: ${msg.token})...`)

            // 4. Process individual message
            await this.processMessageItem(msg)

        } catch (err) {
            Logger.error('queue', `Error in processNextForDevice for ${deviceToken}: ${err.message}`)
        } finally {
            // 5. Release lock
            this.processingLocks.delete(deviceToken)
        }
    }

    /**
     * Internal helper to process a single message item
     * @param {Model} msg 
     */
    async processMessageItem(msg) {
        try {
            // Update status to processing
            await msg.update({ status: 'processing' })

            // Check if client is ready
            if (!whatsappService.isClientReady(msg.device_token)) {
                const info = whatsappService.getClientInfo(msg.device_token)
                const state = info?.state || 'unknown'

                if (['initializing', 'AUTHENTICATING', 'authenticating'].includes(state)) {
                    await msg.update({
                        status: 'queued',
                        scheduled_at: new Date(Date.now() + 30000)
                    })
                    return
                }
                throw new Error(`Device not ready (State: ${state})`)
            }

            // 1. Burst Protection Check
            if (this.checkBurstLimit(msg.device_token)) {
                Logger.info('queue', `Burst protection active for ${msg.device_token}. Skipping message ${msg.token} temporarily (event-driven).`)
                await msg.update({
                    status: 'queued',
                    scheduled_at: new Date(Date.now() + 60000)
                })
                return
            }

            // Fetch user settings from cache (avoids N+1 queries)
            const userSettings = await this._getUserSettings(msg.user_token)

            // 2. Campaign Throttle: Mandatory random delay (20s-60s) for campaigns
            let delay = 0
            if (msg.metadata && msg.metadata.campaign_token) {
                delay = Math.floor(Math.random() * 40000) + 20000 // 20s to 60s
                Logger.debug('queue', `Campaign throttle applied for ${msg.token}: ${delay}ms`)
            } else {
                // Standard priority-based delay
                delay = this.getDelayForPriority(msg.priority, userSettings, msg.metadata)
            }

            if (delay > 0) {
                Logger.debug('queue', `Waiting ${delay}ms delay for message ${msg.token}`)
                await new Promise((resolve) => setTimeout(resolve, delay))
            }

            // Re-check burst limit
            if (this.checkBurstLimit(msg.device_token)) {
                Logger.info('queue', `Burst limit hit after delay for ${msg.device_token}. Rescheduling...`)
                await msg.update({
                    status: 'queued',
                    scheduled_at: new Date(Date.now() + 10000)
                })
                return
            }

            // Send message
            let response
            if (msg.type === 'text') {
                response = await whatsappService.sendMessage(msg.device_token, msg.to, msg.message, {
                    user_token: msg.user_token,
                    metadata: msg.metadata
                })
            } else {
                response = await whatsappService.sendMediaMessage(
                    msg.device_token,
                    msg.to,
                    {
                        url: msg.media_url,
                        mimetype: msg.media_mimetype,
                        user_token: msg.user_token,
                        metadata: msg.metadata
                    },
                    msg.message,
                )
            }

            // Update status to completed
            await msg.update({
                status: 'completed',
                processed_at: new Date(),
            })

            // Increment burst counter
            this.incrementBurst(msg.device_token)

            // Update campaign stats if applicable
            if (msg.metadata && msg.metadata.campaign_token) {
                try {
                    const campaignService = require('./campaign.service')
                    await campaignService.updateStats(msg.metadata.campaign_token, true)
                } catch (campaignErr) {
                    Logger.warn(`Failed to update campaign stats: ${campaignErr.message}`)
                }
            }

            // Update scheduled message status if applicable
            if (msg.metadata && msg.metadata.scheduled_msg_token) {
                try {
                    const scheduledMessageService = require('./scheduledMessage.service')
                    await scheduledMessageService.updateStatus(msg.metadata.scheduled_msg_token, true)
                } catch (schedErr) {
                    Logger.warn(`Failed to update scheduled message stats: ${schedErr.message}`)
                }
            }

            // Emit realtime update
            this.emitQueueUpdate(msg, 'sent')

        } catch (err) {
            Logger.error('queue', `Failed to process item ${msg.token}: ${err.message}`)
            const newAttempts = msg.attempts + 1

            if (newAttempts >= msg.max_attempts) {
                await msg.update({
                    status: 'failed',
                    attempts: newAttempts,
                    error_message: err.message,
                    processed_at: new Date(),
                })

                if (msg.metadata && msg.metadata.campaign_token) {
                    try {
                        const campaignService = require('./campaign.service')
                        await campaignService.updateStats(msg.metadata.campaign_token, false)
                    } catch (campaignErr) {
                        Logger.warn('queue', `Failed to update campaign stats: ${campaignErr.message}`)
                    }
                }

                if (msg.metadata && msg.metadata.scheduled_msg_token) {
                    try {
                        const scheduledMessageService = require('./scheduledMessage.service')
                        await scheduledMessageService.updateStatus(msg.metadata.scheduled_msg_token, false, err.message)
                    } catch (schedErr) {
                        Logger.warn('queue', `Failed to update scheduled message stats: ${schedErr.message}`)
                    }
                }
                this.emitQueueUpdate(msg, 'failed')
            } else {
                await msg.update({
                    status: 'queued',
                    attempts: newAttempts,
                    error_message: err.message,
                    scheduled_at: new Date(Date.now() + 60000),
                })
                this.emitQueueUpdate(msg, 'retrying')
            }
        }
    }

    /**
     * Get delay for priority level
     * @param {string} priority - Priority level
     * @returns {number} Delay in milliseconds
     */
    getDelayForPriority(priority, userSettings = {}, msgMetadata = {}) {
        // If message has custom delay in metadata (e.g. from campaign or API payload), use that
        let min = msgMetadata?.min_delay || msgMetadata?.delay
        let max = msgMetadata?.max_delay || min

        if (min) {
            const minMs = parseInt(min) * 1000
            const maxMs = parseInt(max) * 1000
            if (!isNaN(minMs)) {
                // Random delay between min and max
                return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
            }
        }

        // If user has a custom delay set in messaging settings, use that as base
        // otherwise use system defaults. Minimum 1s as requested.
        let userDelay = parseInt(userSettings.queue_delay) * 1000 // convert to ms
        if (!isNaN(userDelay)) userDelay = Math.max(userDelay, 1000)

        const delays = {
            high: parseInt(process.env.QUEUE_PREMIUM_DELAY) || 0,
            normal: !isNaN(userDelay) ? userDelay : (parseInt(process.env.QUEUE_NORMAL_DELAY) || 1000),
            low: !isNaN(userDelay) ? Math.max(userDelay, 5000) : (parseInt(process.env.QUEUE_FREE_DELAY) || 5000),
        }

        return delays[priority] || delays.normal
    }

    /**
     * Get queue statistics
     * @param {string} userToken - User token
     * @returns {Promise<object>}
     */
    async getQueueStats(userToken) {
        const stats = await db.models.MessageQueue.findAll({
            where: { user_token: userToken },
            attributes: ['status', [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']],
            group: ['status'],
            raw: true,
        })

        const result = {
            queued: 0,
            processing: 0,
            completed: 0,
            failed: 0,
        }

        stats.forEach((stat) => {
            result[stat.status] = parseInt(stat.count)
        })

        return result
    }

    /**
     * Cancel queued message
     * @param {string} queueToken - Queue item token
     * @param {string} userToken - User token
     * @returns {Promise<object>}
     */
    async cancelMessage(queueToken, userToken) {
        const queueItem = await db.models.MessageQueue.findOne({
            where: {
                token: queueToken,
                user_token: userToken,
                status: 'queued',
            },
        })

        if (!queueItem) {
            throw new Error('Queue item not found or cannot be cancelled')
        }

        await queueItem.update({
            status: 'failed',
            error_message: 'Cancelled by user',
            processed_at: new Date(),
        })

        return {
            success: true,
            message: 'Message cancelled successfully',
        }
    }

    /**
     * Delete old completed/failed records from the queue table.
     * Should be called by a cron job periodically to prevent table bloat.
     * @param {number} olderThanDays - Delete records older than this many days (default 7)
     * @returns {Promise<number>} - Number of deleted records
     */
    async cleanupOldRecords(olderThanDays = 7) {
        try {
            const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
            const deleted = await db.models.MessageQueue.destroy({
                where: {
                    status: { [Op.in]: ['completed', 'failed'] },
                    processed_at: { [Op.lte]: cutoff }
                }
            })
            Logger.info('queue', `DB Cleanup: Deleted ${deleted} stale queue records older than ${olderThanDays} days.`)
            return deleted
        } catch (err) {
            Logger.error('queue', `DB Cleanup failed: ${err.message}`)
            return 0
        }
    }

    /**
     * Process individual scheduled messages
     * Moves messages from ScheduledMessage to MessageQueue when ready
     * @returns {Promise<object>}
     */
    async processScheduledMessages() {
        const now = new Date()
        try {
            const messages = await db.models.ScheduledMessage.findAll({
                where: {
                    status: 'pending',
                    scheduled_at: {
                        [Op.lte]: now
                    }
                },
                limit: 100
            })

            const count = messages.length
            if (count > 0) {
                Logger.info('scheduler', `Processing ${count} individual scheduled messages...`)
                for (const msg of messages) {
                    await this.addToQueue({
                        device_token: msg.device_token,
                        user_token: msg.user_token,
                        to: msg.to,
                        message: msg.message,
                        type: msg.type,
                        media_url: msg.media_url,
                        media_mimetype: msg.media_mimetype,
                        priority: 'normal',
                        metadata: { ...msg.metadata, scheduled_msg_token: msg.token }
                    })

                    // Handle recurrence
                    if (msg.is_recurring && msg.recurrence_type) {
                        const nextDate = this.calculateNextRecurrence(msg.scheduled_at, msg.recurrence_type)
                        const recurrenceCount = (msg.recurrence_count || 0) + 1

                        // Check if we reached recurrence end
                        if (msg.recurrence_end && nextDate > msg.recurrence_end) {
                            await msg.update({ status: 'sent', sent_at: new Date(), recurrence_count: recurrenceCount })
                        } else {
                            await msg.update({
                                scheduled_at: nextDate,
                                sent_at: new Date(),
                                recurrence_count: recurrenceCount,
                                status: 'pending' // Ensure it remains pending for next run
                            })
                        }
                    } else {
                        await msg.update({ status: 'sent', sent_at: new Date() })
                    }

                    // Emit real-time update for scheduled message list
                    const io = Socket.getInstance()
                    if (io) {
                        io.to(`user:${msg.user_token}`).emit('scheduled:update', {
                            token: msg.token,
                            status: msg.is_recurring ? 'pending' : 'sent',
                            to: msg.to,
                            next_scheduled: msg.is_recurring ? msg.scheduled_at : null
                        })
                    }
                }
            }
            return { success: true, processedCount: count }
        } catch (err) {
            Logger.error('scheduler', `Error processing individual scheduled messages: ${err.message}`)
            throw err
        }
    }

    /**
     * Calculate next recurrence date
     * @param {Date} current - Current scheduled date
     * @param {string} type - Recurrence type
     * @returns {Date}
     */
    calculateNextRecurrence(current, type) {
        const next = new Date(current)
        switch (type) {
            case 'hourly':
                next.setHours(next.getHours() + 1)
                break
            case 'daily':
                next.setDate(next.getDate() + 1)
                break
            case 'weekly':
                next.setDate(next.getDate() + 7)
                break
            case 'monthly':
                next.setMonth(next.getMonth() + 1)
                break
            case 'yearly':
                next.setFullYear(next.getFullYear() + 1)
                break
        }
        return next
    }

    /**
     * Emit realtime queue update via Socket.IO
     * @param {Object} msg - Message queue item
     * @param {string} status - Update status (sent, failed, retrying)
     */
    emitQueueUpdate(msg, status) {
        try {
            const Socket = require('@core/socket.core')
            const io = Socket.getInstance()
            if (io) {
                io.to(`user:${msg.user_token}`).emit('queue:update', {
                    token: msg.token,
                    to: msg.to,
                    status: status,
                    device_token: msg.device_token,
                    attempts: msg.attempts,
                    metadata: msg.metadata,
                    timestamp: new Date()
                })
            }
        } catch (err) {
            Logger.warn('queue', `Failed to emit queue update via Socket.IO: ${err.message}`)
        }
    }
    /**
     * Check if device is in burst cooldown or limit
     * @param {string} deviceToken 
     * @returns {boolean} true if should wait
     */
    checkBurstLimit(deviceToken) {
        if (!this.burstTracker.has(deviceToken)) {
            this.burstTracker.set(deviceToken, { count: 0, lastMsgTime: Date.now(), coolingDownUntil: 0 })
            return false
        }

        const tracker = this.burstTracker.get(deviceToken)
        const now = Date.now()

        // Check if in cooldown
        if (tracker.coolingDownUntil > now) {
            return true
        }

        // Reset counter if long time since last message (e.g. > 5 mins)
        // If we haven't sent anything for a while, we can reset the burst count
        if (now - tracker.lastMsgTime > 5 * 60 * 1000) {
            tracker.count = 0
            tracker.coolingDownUntil = 0
            return false
        }

        // Burst Limit: 5-8 messages
        // We randomize the limit slightly to avoid patterns
        const burstLimit = 5 + (deviceToken.charCodeAt(0) % 4) // Deterministic random-ish (5-8) based on token

        if (tracker.count >= burstLimit) {
            // Trigger Micro-Sleep: 3-7 minutes
            const sleepTime = (Math.floor(Math.random() * 4) + 3) * 60 * 1000
            tracker.coolingDownUntil = now + sleepTime
            tracker.count = 0 // Reset count after sleep is triggered (effective after sleep)
            Logger.info('queue', `Burst limit (${burstLimit}) reached for ${deviceToken}. Sleeping for ${sleepTime / 1000}s.`)
            return true
        }

        return false
    }

    /**
     * Increment burst counter after successful send
     * @param {string} deviceToken 
     */
    incrementBurst(deviceToken) {
        if (!this.burstTracker.has(deviceToken)) {
            this.burstTracker.set(deviceToken, { count: 1, lastMsgTime: Date.now(), coolingDownUntil: 0 })
        } else {
            const tracker = this.burstTracker.get(deviceToken)
            tracker.count++
            tracker.lastMsgTime = Date.now()
        }
    }
}

module.exports = new MessageQueueService()
