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
        // This could be stored in a JSON column in User or a separate table
        // For now, we'll assume it's in a metadata column in User
        const user = await db.models.User.findOne({ where: { token: userToken } })
        if (!user) throw new Error('User not found')

        await user.update({
            metadata: { ...user.metadata, settings }
        })

        return {
            success: true,
            message: 'Settings updated successfully'
        }
    }
}

module.exports = new SettingsService()
