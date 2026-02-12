'use strict'

const db = require('@core/database.core')
const Logger = require('@core/logger.core')
const Hash = require('@core/helpers/hash.helper')
const crypto = require('crypto')

/**
 * API Key Service
 * Manages API keys for external access
 */
class ApiKeyService {
    /**
     * Create a new API key
     * @param {string} userToken - User token
     * @param {object} data - Key data
     * @returns {Promise<object>}
     */
    async createKey(userToken, data) {
        const { name, domain_whitelist, ip_whitelist } = data

        if (!name) {
            throw new Error('Key name is required')
        }

        // Quota check and decrement
        const subscriptionService = require('./subscription.service')
        const canCreate = await subscriptionService.decrementUsage(userToken, 'api_keys')
        if (!canCreate) {
            throw new Error('API Key limit reached or no active subscription')
        }

        const key = await db.models.ApiKey.create({
            token: Hash.token(),
            user_token: userToken,
            key: `sk-proj-wraf${crypto.randomBytes(24).toString('hex')}`,
            name,
            domain_whitelist: domain_whitelist || '*',
            ip_whitelist: ip_whitelist || '*',
            is_active: true
        })

        return {
            success: true,
            key: {
                key: key.key,
                token: key.token
            }
        }
    }

    /**
     * Get user API keys
     * @param {string} userToken - User token
     * @returns {Promise<Array>}
     */
    async getKeys(userToken) {
        return await db.models.ApiKey.findAll({
            where: { user_token: userToken },
            // attributes: { exclude: ['key'] }, // Remove this as frontend needs it for masking
            order: [['createdAt', 'DESC']]
        })
    }

    /**
     * Delete API key
     * @param {string} userToken - User token
     * @param {string} token - Key token
     * @returns {Promise<object>}
     */
    async deleteKey(userToken, token) {
        const result = await db.models.ApiKey.destroy({
            where: { token, user_token: userToken }
        })

        if (!result) throw new Error('API Key not found')

        // Restore quota
        const subscriptionService = require('./subscription.service')
        await subscriptionService.decrementUsage(userToken, 'api_keys', -1)

        return {
            success: true,
            message: 'API Key deleted'
        }
    }

    /**
     * Validate an API key
     * @param {string} keyString - The API key
     * @param {string} domain - Calling domain
     * @param {string} ip - Calling IP
     * @returns {Promise<object|null>}
     */
    async validateKey(keyString, domain, ip) {
        const key = await db.models.ApiKey.findOne({
            where: { key: keyString, is_active: true }
        })

        if (!key) return null

        // Validate domain whitelist
        if (key.domain_whitelist !== '*') {
            const domains = key.domain_whitelist.split(',').map(d => d.trim())
            if (!domains.includes(domain)) return null
        }

        // Validate IP whitelist
        if (key.ip_whitelist !== '*') {
            const ips = key.ip_whitelist.split(',').map(i => i.trim())
            if (!ips.includes(ip)) return null
        }

        // Update last used
        await key.update({
            last_used_at: new Date(),
            usage_count: key.usage_count + 1
        })

        return key
    }
}

module.exports = new ApiKeyService()
