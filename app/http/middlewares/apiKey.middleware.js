'use strict'

const apiKeyService = require('@app/services/apiKey.service')
const Logger = require('@core/logger.core')

/**
 * API Key Middleware
 * Validates external API access using wf_ keys
 */
const apiKeyMiddleware = async ({ req, res, next }) => {
    try {
        const apiKey = req.headers['x-api-key'] || req.query.api_key

        if (!apiKey) {
            return res.status(401).json({
                success: false,
                message: 'API Key is required in X-API-KEY header or api_key query param'
            })
        }

        const domain = req.get('origin') || req.get('referer') || '*'
        const ip = req.ip

        const keyRecord = await apiKeyService.validateKey(apiKey, domain, ip)

        if (!keyRecord) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or unauthorized API Key'
            })
        }

        // Attach user and key info to request
        req.user = { token: keyRecord.user_token, is_api: true }
        req.apiKey = keyRecord

        return next()
    } catch (err) {
        Logger.error('API Key Middleware Error', err)
        return res.status(500).json({
            success: false,
            message: 'Internal server error during authentication'
        })
    }
}

module.exports = apiKeyMiddleware
