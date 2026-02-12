'use strict'

const db = require('@core/database.core')
const { Op } = db
const Logger = require('@core/logger.core')
const Hash = require('@core/helpers/hash.helper')

/**
 * Scheduled Message Service
 * Handles individual scheduled message management
 */
class ScheduledMessageService {
    /**
     * Create multiple scheduled messages
     * @param {string} userToken - User token
     * @param {object} data - Scheduled message data (supports to as array/string and book_id)
     * @returns {Promise<object>}
     */
    async createBulkScheduledMessages(userToken, data) {
        let { device_token, to, book_id, message, type = 'text', media_url, scheduled_at, min_delay, max_delay, is_recurring, recurrence_type, recurrence_end } = data

        // Resolve recipients
        let recipients = []
        if (book_id) {
            const book = await db.models.ContactBook.findOne({
                where: { id: book_id, user_token: userToken }
            })
            if (book && Array.isArray(book.contacts)) {
                recipients = book.contacts.map(c => c.phone || c.whatsapp).filter(Boolean)
            }
        } else if (to) {
            recipients = Array.isArray(to) ? to : to.split(/,|\n/).map(r => r.trim()).filter(Boolean)
        }

        if (recipients.length === 0) {
            throw new Error('No valid recipients found')
        }

        const results = []
        for (const recipient of recipients) {
            try {
                const result = await this.createScheduledMessage(userToken, {
                    device_token,
                    to: recipient,
                    message,
                    type,
                    media_url,
                    scheduled_at,
                    target_type: book_id ? 'book' : 'single',
                    target_id: book_id || null,
                    min_delay: min_delay,
                    max_delay: max_delay,
                    is_recurring,
                    recurrence_type,
                    recurrence_end
                })
                results.push(result.scheduledMessage)
            } catch (err) {
                Logger.error(`Failed to schedule message for ${recipient}: ${err.message}`)
            }
        }

        return {
            success: true,
            message: `${results.length} messages scheduled successfully`,
            scheduledMessages: results
        }
    }

    /**
     * Create a new scheduled message
     * @param {string} userToken - User token
     * @param {object} data - Scheduled message data
     * @returns {Promise<object>}
     */
    async createScheduledMessage(userToken, data) {
        const { device_token, to, message, type = 'text', media_url, scheduled_at, min_delay, max_delay, is_recurring, recurrence_type, recurrence_end } = data

        if (!device_token || !to || !message || !scheduled_at) {
            throw new Error('Device token, recipient, message, and scheduled time are required')
        }

        // Validate scheduled time is in the future
        const scheduledDate = new Date(scheduled_at)
        if (scheduledDate <= new Date()) {
            throw new Error('Scheduled time must be in the future')
        }

        // Verify user has access to device
        const userDevice = await db.models.UserDevice.findOne({
            where: { user_token: userToken, device_token }
        })

        if (!userDevice) {
            throw new Error('You do not have access to this device')
        }

        const scheduledMessage = await db.models.ScheduledMessage.create({
            token: Hash.token(),
            user_token: userToken,
            device_token,
            to,
            message,
            type,
            media_url,
            scheduled_at: scheduledDate,
            status: 'pending',
            target_type: data.target_type || 'single',
            target_id: data.target_id || null,
            is_recurring: !!is_recurring || (is_recurring === 'true'),
            recurrence_type,
            recurrence_end: recurrence_end ? new Date(recurrence_end) : null,
            metadata: {
                ...data.metadata,
                min_delay: min_delay || 2,
                max_delay: max_delay || 5
            }
        })

        Logger.info(`Scheduled message created: ${scheduledMessage.token} for ${scheduled_at}`)

        return {
            success: true,
            scheduledMessage
        }
    }

    /**
     * Get user scheduled messages
     * @param {string} userToken - User token
     * @param {object} filters - Optional filters (status, device_token)
     * @returns {Promise<Array>}
     */
    async getScheduledMessages(userToken, filters = {}) {
        const where = { user_token: userToken }

        if (filters.status) {
            where.status = filters.status
        }

        if (filters.device_token) {
            where.device_token = filters.device_token
        }

        return await db.models.ScheduledMessage.findAll({
            where,
            order: [['scheduled_at', 'ASC']],
            include: [
                {
                    model: db.models.Device,
                    as: 'device',
                    attributes: ['token', 'name', 'status']
                },
                {
                    model: db.models.User,
                    as: 'user',
                    attributes: ['name']
                }
            ]
        })
    }

    /**
     * Get scheduled message details
     * @param {string} userToken - User token
     * @param {string} token - Scheduled message token
     * @returns {Promise<object>}
     */
    async getScheduledMessage(userToken, token) {
        const scheduledMessage = await db.models.ScheduledMessage.findOne({
            where: { token, user_token: userToken },
            include: [
                {
                    model: db.models.Device,
                    as: 'device',
                    attributes: ['token', 'name', 'status']
                }
            ]
        })

        if (!scheduledMessage) throw new Error('Scheduled message not found')

        return scheduledMessage
    }

    /**
     * Cancel a pending scheduled message
     * @param {string} userToken - User token
     * @param {string} token - Scheduled message token
     * @returns {Promise<object>}
     */
    async cancelScheduledMessage(userToken, token) {
        const scheduledMessage = await db.models.ScheduledMessage.findOne({
            where: { token, user_token: userToken }
        })

        if (!scheduledMessage) throw new Error('Scheduled message not found')

        if (scheduledMessage.status !== 'pending') {
            throw new Error('Only pending messages can be cancelled')
        }

        await scheduledMessage.update({
            status: 'cancelled',
            error_message: 'Cancelled by user'
        })

        Logger.info(`Scheduled message cancelled: ${token}`)

        return {
            success: true,
            message: 'Scheduled message cancelled successfully'
        }
    }

    /**
     * Delete a scheduled message
     * @param {string} userToken - User token
     * @param {string} token - Scheduled message token
     * @returns {Promise<object>}
     */
    async deleteScheduledMessage(userToken, token) {
        const result = await db.models.ScheduledMessage.destroy({
            where: { token, user_token: userToken }
        })

        if (!result) throw new Error('Scheduled message not found')

        Logger.info(`Scheduled message deleted: ${token}`)

        return {
            success: true,
            message: 'Scheduled message deleted successfully'
        }
    }

    /**
     * Get statistics for user's scheduled messages
     * @param {string} userToken - User token
     * @returns {Promise<object>}
     */
    async getStats(userToken) {
        const stats = await db.models.ScheduledMessage.findAll({
            where: { user_token: userToken },
            attributes: [
                'status',
                [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
            ],
            group: ['status'],
            raw: true
        })

        const result = {
            total: 0,
            pending: 0,
            sent: 0,
            failed: 0,
            cancelled: 0
        }

        stats.forEach(stat => {
            if (result.hasOwnProperty(stat.status)) {
                result[stat.status] = parseInt(stat.count)
            }
            result.total += parseInt(stat.count)
        })

        return result
    }

    /**
     * Update scheduled message status (called by MessageQueue)
     * @param {string} token - Scheduled message token
     * @param {boolean} success - Whether it was sent successfully
     * @param {string} error - Optional error message
     */
    async updateStatus(token, success, error = null) {
        const msg = await db.models.ScheduledMessage.findOne({ where: { token } })
        if (!msg) return

        // If recurring and it failed, we might want to keep it as pending for next run but log the error
        // Or if it's one-time and failed, mark as failed.
        // For now, let's just mark the current "sent" status as "failed" if it failed.
        if (!success) {
            await msg.update({
                status: 'failed',
                error_message: error || 'Failed to deliver'
            })
        }

        // Emit realtime update
        try {
            const Socket = require('@core/socket.core')
            const io = Socket.getInstance()
            if (io) {
                io.to(`user:${msg.user_token}`).emit('scheduled:update', {
                    token: msg.token,
                    status: msg.status,
                    error: msg.error_message
                })
            }
        } catch (err) {
            Logger.warn('Failed to emit scheduled update', err)
        }
    }
}

module.exports = new ScheduledMessageService()
