'use strict'

const config = require('@app/config')
const db = require('@core/database.core')

/**
 * App Mode Service
 * Centralizes logic for different application modes
 */
class AppModeService {
    constructor() {
        this.modes = {
            SAAS: 'SAAS',
            NO_SUBSCRIPTION: 'NO_SUBSCRIPTION',
            DASHBOARD: 'DASHBOARD'
        }
    }

    /**
     * Get current application mode
     * Returns value from database (if exists) or config
     * @returns {Promise<string>}
     */
    async getMode() {
        try {
            const setting = await db.models.Setting.findOne({ where: { key: 'app_mode' } })
            return setting ? setting.value : config.app.mode
        } catch (err) {
            return config.app.mode
        }
    }

    /**
     * Check if subscriptions are enabled
     * @returns {Promise<boolean>}
     */
    async isSubscriptionEnabled() {
        const mode = await this.getMode()
        return mode === this.modes.SAAS
    }

    /**
     * Check if public registration is allowed
     * @returns {Promise<boolean>}
     */
    async isRegistrationAllowed() {
        const mode = await this.getMode()
        if (mode === this.modes.DASHBOARD) {
            // Check if dashboard allows registration via DB setting
            const regSetting = await db.models.Setting.findOne({ where: { key: 'allow_registration' } })
            return regSetting ? regSetting.value === 'true' : false
        }
        return true
    }

    /**
     * Check if feature is enabled
     * @param {string} featureName 
     * @returns {Promise<boolean>}
     */
    async isFeatureEnabled(featureName) {
        const mode = await this.getMode()

        // In Dashboard or No Subscription mode, all core features are typically free/enabled
        if (mode !== this.modes.SAAS) return true

        // For SaaS, we might check a global feature toggle in DB
        const featureSetting = await db.models.Setting.findOne({ where: { key: `feature_${featureName}` } })
        return featureSetting ? featureSetting.value === 'true' : true
    }
}

module.exports = new AppModeService()
