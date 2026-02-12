'use strict'

const templateService = require('@app/services/template.service')

/**
 * Template Controller
 * Handles message template management
 */
class TemplateController {
    /**
     * Create a new template
     * POST /api/templates
     */
    async create({ req, res }) {
        try {
            const result = await templateService.createTemplate(req.user.token, req.body)
            return res.status(201).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Get all templates
     * GET /api/templates
     */
    async getAll({ req, res }) {
        try {
            const templates = await templateService.getTemplates(req.user.token)
            return res.status(200).json({
                success: true,
                templates
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Get template by token
     * GET /api/templates/:token
     */
    async getOne({ req, res }) {
        try {
            const { token } = req.params
            const template = await templateService.getTemplateByToken(req.user.token, token)
            return res.status(200).json({
                success: true,
                template
            })
        } catch (err) {
            return res.status(404).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Update template
     * PUT /api/templates/:token
     */
    async update({ req, res }) {
        try {
            const { token } = req.params
            const result = await templateService.updateTemplate(req.user.token, token, req.body)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Delete template
     * DELETE /api/templates/:token
     */
    async delete({ req, res }) {
        try {
            const { token } = req.params
            const result = await templateService.deleteTemplate(req.user.token, token)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }
}

module.exports = TemplateController
