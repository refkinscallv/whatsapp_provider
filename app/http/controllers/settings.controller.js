'use strict'

const settingsService = require('@app/services/settings.service')

/**
 * Settings Controller
 * Handles user profile and application settings management
 */
class SettingsController {
    /**
     * Get user profile
     * GET /api/settings/profile
     */
    async getProfile({ req, res }) {
        try {
            const profile = await settingsService.getProfile(req.user.token)
            return res.status(200).json({
                success: true,
                profile
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Update user profile
     * PUT /api/settings/profile
     */
    async updateProfile({ req, res }) {
        try {
            const result = await settingsService.updateProfile(req.user.token, req.body)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Update app settings
     * PUT /api/settings
     */
    async updateSettings({ req, res }) {
        try {
            const result = await settingsService.updateSettings(req.user.token, req.body)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }
}

module.exports = SettingsController
