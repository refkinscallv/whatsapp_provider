'use strict'

const campaignService = require('@app/services/campaign.service')

/**
 * Campaign Controller
 * Handles broadcast campaign management
 */
class CampaignController {
    /**
     * Create a new campaign
     * POST /api/campaigns
     */
    async create({ req, res }) {
        try {
            const data = req.body
            const file = req.files?.file

            // Handle file upload
            if (file) {
                const path = require('path')
                const fs = require('fs')
                const Hash = require('@core/helpers/hash.helper')
                const config = require('@app/config')

                const uploadDir = path.join(config.express.static.path, 'uploads/media')
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true })
                }

                const fileName = `${Date.now()}-${Hash.token(8)}${path.extname(file.name)}`
                const filePath = path.join(uploadDir, fileName)

                await file.mv(filePath)

                const baseUrl = config.app.url.replace(/\/$/, '')
                data.media_url = `${baseUrl}/uploads/media/${fileName}`
                data.type = 'image' // Default to image if file is uploaded
            }

            const result = await campaignService.createCampaign(req.user.token, data)
            return res.status(201).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Get all campaigns
     * GET /api/campaigns
     */
    async getAll({ req, res }) {
        try {
            const campaigns = await campaignService.getCampaigns(req.user.token)
            return res.status(200).json({
                success: true,
                campaigns
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Get campaign by token
     * GET /api/campaigns/:token
     */
    async getOne({ req, res }) {
        try {
            const { token } = req.params
            const campaign = await campaignService.getCampaign(req.user.token, token)
            return res.status(200).json({
                success: true,
                campaign
            })
        } catch (err) {
            return res.status(404).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Delete campaign
     * DELETE /api/campaigns/:token
     */
    async delete({ req, res }) {
        try {
            const { token } = req.params
            const result = await campaignService.deleteCampaign(req.user.token, token)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Get campaign statistics
     * GET /api/campaigns/stats
     */
    async getStats({ req, res }) {
        try {
            const stats = await campaignService.getStats(req.user.token)
            return res.status(200).json({
                success: true,
                stats
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }
}

module.exports = CampaignController
