'use strict'

const db = require('@core/database.core')
const Logger = require('@core/logger.core')
const Hash = require('@core/helpers/hash.helper')

/**
 * Template Service
 * Manages message templates with variable substitution
 */
class TemplateService {
    /**
     * Create a new message template
     * @param {string} userToken - User token
     * @param {object} data - Template data
     * @returns {Promise<object>}
     */
    async createTemplate(userToken, data) {
        const { name, content, type = 'text', media_url, category } = data

        if (!name || !content) {
            throw new Error('Template name and content are required')
        }

        const template = await db.models.MessageTemplate.create({
            token: Hash.token(),
            user_token: userToken,
            name,
            content,
            type,
            media_url,
            category
        })

        return {
            success: true,
            template
        }
    }

    /**
     * Update an existing template
     * @param {string} userToken - User token
     * @param {string} token - Template token
     * @param {object} data - Updated data
     * @returns {Promise<object>}
     */
    async updateTemplate(userToken, token, data) {
        const template = await db.models.MessageTemplate.findOne({
            where: { token, user_token: userToken }
        })

        if (!template) {
            throw new Error('Template not found')
        }

        await template.update(data)

        return {
            success: true,
            template
        }
    }

    /**
     * Get all templates for a user
     * @param {string} userToken - User token
     * @returns {Promise<Array>}
     */
    async getTemplates(userToken) {
        try {
            const templates = await db.models.MessageTemplate.findAll({
                where: { user_token: userToken },
                order: [['name', 'ASC']],
                include: [
                    {
                        model: db.models.User,
                        as: 'user',
                        attributes: ['name'],
                        required: false
                    }
                ]
            })

            Logger.debug('template', `Fetched ${templates.length} templates for user ${userToken}`)
            return templates
        } catch (err) {
            Logger.error('template', `Error fetching templates for ${userToken}: ${err.message}`)
            return []
        }
    }

    /**
     * Get detailed template by token
     * @param {string} userToken - User token
     * @param {string} token - Template token
     * @returns {Promise<object>}
     */
    async getTemplateByToken(userToken, token) {
        const template = await db.models.MessageTemplate.findOne({
            where: { token, user_token: userToken }
        })

        if (!template) {
            throw new Error('Template not found')
        }

        return template
    }

    /**
     * Delete template
     * @param {string} userToken - User token
     * @param {string} token - Template token
     * @returns {Promise<object>}
     */
    async deleteTemplate(userToken, token) {
        const result = await db.models.MessageTemplate.destroy({
            where: { token, user_token: userToken }
        })

        if (!result) {
            throw new Error('Template not found or already deleted')
        }

        return {
            success: true,
            message: 'Template deleted successfully'
        }
    }

    /**
     * Parse template content with variables and spintax
     * example: "{Halo|Hai|P} apa kabar {name}?"
     * @param {string} content - Template content
     * @param {object} variables - Key-value pairs of variables
     * @returns {string} Parsed content
     */
    parseTemplate(content, variables = {}) {
        let parsed = content

        // 1. Match variables like {name} or {{name}}
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`\\{{1,2}\\s*${key}\\s*\\}{1,2}`, 'g')
            parsed = parsed.replace(regex, variables[key] || '')
        })

        // 2. Parse Spintax {Word1|Word2|Word3}
        parsed = this.parseSpintax(parsed)

        return parsed
    }

    /**
     * Parse Spintax patterns
     * @param {string} content 
     * @returns {string}
     */
    parseSpintax(content) {
        if (!content) return content

        const spintaxRegex = /\{([^{}|]+\|[^{}]+)\}/g
        let match

        while ((match = spintaxRegex.exec(content)) !== null) {
            const options = match[1].split('|')
            const selection = options[Math.floor(Math.random() * options.length)]
            content = content.replace(match[0], selection)

            // Reset regex to catch nested or subsequent patterns correctly
            spintaxRegex.lastIndex = 0
        }

        return content
    }
}

module.exports = new TemplateService()
