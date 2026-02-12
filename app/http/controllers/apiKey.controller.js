'use strict'

const apiKeyService = require('@app/services/apiKey.service')

/**
 * API Key Controller
 * Handles API key management for external access
 */
class ApiKeyController {
    /**
     * Get all API keys
     * GET /api/keys
     */
    async getAll({ req, res }) {
        try {
            const keys = await apiKeyService.getKeys(req.user.token)
            return res.status(200).json({
                success: true,
                keys
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Create a new API key
     * POST /api/keys
     */
    async create({ req, res }) {
        try {
            const result = await apiKeyService.createKey(req.user.token, req.body)
            return res.status(201).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Delete API key
     * DELETE /api/keys/:token
     */
    async delete({ req, res }) {
        try {
            const { token } = req.params
            const result = await apiKeyService.deleteKey(req.user.token, token)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }
}

module.exports = ApiKeyController
