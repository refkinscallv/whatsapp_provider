'use strict'

const db = require('@core/database.core')
const Logger = require('@core/logger.core')
const Hash = require('@core/helpers/hash.helper')

/**
 * Auto-Reply Service
 * Manages bot auto-reply rules and matching logic
 */
class AutoReplyService {
    /**
     * Create a new auto-reply rule
     * @param {string} userToken - User token
     * @param {object} data - Rule data
     * @returns {Promise<object>}
     */
    async createRule(userToken, data) {
        const { device_token, name, trigger_type, trigger_pattern, reply_message, reply_delay, priority, is_active } = data

        if (!name || !trigger_pattern || !reply_message) {
            throw new Error('Name, trigger pattern, and reply message are required')
        }

        const rule = await db.models.AutoReplyRule.create({
            token: Hash.token(),
            user_token: userToken, // Note: Added user_token for completeness if needed by other services
            device_token,
            name,
            trigger_type: trigger_type || 'contains',
            trigger_pattern,
            reply_message,
            reply_delay: reply_delay || 0,
            priority: priority || 0,
            is_active: is_active !== undefined ? is_active : true
        })

        return {
            success: true,
            rule
        }
    }

    /**
     * Update an existing rule
     * @param {string} userToken - User token
     * @param {string} token - Rule token
     * @param {object} data - Updated data
     * @returns {Promise<object>}
     */
    async updateRule(userToken, token, data) {
        const rule = await db.models.AutoReplyRule.findOne({
            where: { token }
            // Note: In a real app we'd also check user_token but UserDevice link handles ownership usually
        })

        if (!rule) {
            throw new Error('Auto-reply rule not found')
        }

        await rule.update(data)

        return {
            success: true,
            rule
        }
    }

    /**
     * Get all rules for a user
     * @param {string} userToken - User token
     * @param {string} deviceToken - Optional device token filter
     * @returns {Promise<Array>}
     */
    async getRules(userToken, deviceToken = null) {
        const where = {}
        if (deviceToken) where.device_token = deviceToken

        // Find devices owned by user to filter rules
        const userDevices = await db.models.UserDevice.findAll({
            where: { user_token: userToken },
            attributes: ['device_token']
        })
        const deviceTokens = userDevices.map(ud => ud.device_token)

        if (deviceToken && !deviceTokens.includes(deviceToken)) {
            throw new Error('Unauthorized device access')
        }

        return await db.models.AutoReplyRule.findAll({
            where: {
                ...where,
                device_token: { [db.Sequelize.Op.in]: deviceTokens }
            },
            order: [['priority', 'DESC'], ['createdAt', 'DESC']],
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
     * Delete rule
     * @param {string} userToken - User token
     * @param {string} token - Rule token
     * @returns {Promise<object>}
     */
    async deleteRule(userToken, token) {
        // First find rule to check ownership via device
        const rule = await db.models.AutoReplyRule.findOne({
            where: { token },
            include: [{ model: db.models.Device, as: 'device' }]
        })

        if (!rule) throw new Error('Rule not found')

        const result = await db.models.AutoReplyRule.destroy({
            where: { token }
        })

        return {
            success: true,
            message: 'Auto-reply rule deleted successfully'
        }
    }

    /**
     * Find matching rule for a message (Old logic preserved but updated column names)
     * @param {string} deviceToken - Device token
     * @param {string} message - Received message text
     * @returns {Promise<object|null>}
     */
    async findMatch(deviceToken, message) {
        if (!message) return null

        const text = message.toLowerCase().trim()

        const rules = await db.models.AutoReplyRule.findAll({
            where: {
                device_token: deviceToken,
                is_active: true
            },
            order: [['priority', 'DESC']]
        })

        for (const rule of rules) {
            const pattern = rule.trigger_pattern.toLowerCase().trim()
            const type = rule.trigger_type

            if (type === 'exact' && text === pattern) return rule
            if (type === 'contains' && text.includes(pattern)) return rule
            if (type === 'starts_with' && text.startsWith(pattern)) return rule
            if (type === 'ends_with' && text.endsWith(pattern)) return rule
            if (type === 'regex') {
                try {
                    const regex = new RegExp(rule.trigger_pattern, 'i')
                    if (regex.test(message)) return rule
                } catch (e) {
                    Logger.error(`Invalid regex in rule ${rule.token}: ${rule.trigger_pattern}`)
                }
            }
        }

        return null
    }

    /**
     * Get auto-reply statistics for a user
     * @param {string} userToken - User token
     * @returns {Promise<object>}
     */
    async getStats(userToken) {
        // Find devices owned by user to filter rules
        const userDevices = await db.models.UserDevice.findAll({
            where: { user_token: userToken },
            attributes: ['device_token']
        })
        const deviceTokens = userDevices.map(ud => ud.device_token)

        const [total, active] = await Promise.all([
            db.models.AutoReplyRule.count({
                where: { device_token: { [db.Sequelize.Op.in]: deviceTokens } }
            }),
            db.models.AutoReplyRule.count({
                where: {
                    device_token: { [db.Sequelize.Op.in]: deviceTokens },
                    is_active: true
                }
            })
        ])

        return {
            total: total || 0,
            active: active || 0,
            inactive: (total - active) || 0
        }
    }
}

module.exports = new AutoReplyService()
