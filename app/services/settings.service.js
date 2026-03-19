'use strict'

const db = require('@core/database.core')

/**
 * Settings Service
 * Manages user profile and application settings
 */
class SettingsService {
    /**
     * Get user profile and settings
     * @param {string} userToken - User token
     * @returns {Promise<object>}
     */
    async getProfile(userToken) {
        const user = await db.models.User.findOne({
            where: { token: userToken },
            attributes: { exclude: ['password'] }
        })

        if (!user) throw new Error('User not found')

        // Ensure metadata is properly parsed into an object before returning to UI
        if (typeof user.metadata === 'string') {
            try {
                user.metadata = JSON.parse(user.metadata)
            } catch (e) {
                user.metadata = {}
            }
        }

        return user
    }

    /**
     * Update user profile
     * @param {string} userToken - User token
     * @param {object} data - Updated data
     * @returns {Promise<object>}
     */
    async updateProfile(userToken, data) {
        const { name, whatsapp } = data

        const user = await db.models.User.findOne({ where: { token: userToken } })
        if (!user) throw new Error('User not found')

        await user.update({ name, whatsapp })

        return {
            success: true,
            message: 'Profile updated successfully',
            user: {
                name: user.name,
                email: user.email,
                whatsapp: user.whatsapp
            }
        }
    }

    /**
     * Update notification settings
     * @param {string} userToken - User token
     * @param {object} settings - Settings object
     * @returns {Promise<object>}
     */
    async updateSettings(userToken, settings) {
        const user = await db.models.User.findOne({ where: { token: userToken } })
        if (!user) throw new Error('User not found')

        // Sequelize does NOT automatically detect nested JSON mutations.
        // Also, sometimes MySQL/MariaDB returns JSON as a string instead of an object.
        let currentMetadata = {}
        if (typeof user.metadata === 'string') {
            try { currentMetadata = JSON.parse(user.metadata) } catch (e) {}
        } else if (user.metadata && typeof user.metadata === 'object') {
            currentMetadata = user.metadata
        }

        user.set('metadata', {
            ...currentMetadata,
            settings: {
                ...(currentMetadata.settings || {}),
                ...settings
            }
        })
        user.changed('metadata', true) // Force Sequelize to include this column in the UPDATE query
        await user.save()

        // Invalidate in-memory user settings cache in messageQueue service
        // so the new delay is picked up immediately (not after TTL expiry)
        try {
            const mqService = require('./messageQueue.service')
            mqService._userSettingsCache.delete(userToken)
        } catch (e) { /* ignore if not loaded */ }

        return {
            success: true,
            message: 'Settings updated successfully'
        }
    }
}

module.exports = new SettingsService()
