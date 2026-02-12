'use strict'

/**
 * Mailer Core Module
 * Handles email sending functionality using nodemailer
 */

const nodemailer = require('nodemailer')
const ejs = require('ejs')
const path = require('path')
const config = require('@app/config')
const Logger = require('@core/logger.core')

module.exports = class Mailer {
    static transporter = null

    /**
     * Initialize mailer transporter
     */
    static init() {
        try {
            this.transporter = nodemailer.createTransport({
                host: config.mailer.host,
                port: config.mailer.port,
                secure: config.mailer.secure,
                auth: {
                    user: config.mailer.auth.user,
                    pass: config.mailer.auth.pass,
                },
            })
            Logger.info('mailer', 'Mailer initialized successfully')
        } catch (err) {
            Logger.set(err, 'mailer')
            throw err
        }
    }

    /**
     * Send email using template
     * @param {string} to - Recipient email address
     * @param {string} subject - Email subject
     * @param {string} template - Template file name (without extension)
     * @param {Object} data - Data to pass to template
     * @returns {Promise<Object>} Email info
     */
    static async send(to, subject, template, data = {}) {
        try {
            if (!this.transporter) this.init()

            // Build template path
            const templatePath = path.join(__dirname, '../public/views/templates/email', `${template}.email.ejs`)

            // Render email template
            const html = await ejs.renderFile(templatePath, {
                ...data,
                appName: config.app.name,
                appUrl: config.app.url,
            })

            // Send email
            const info = await this.transporter.sendMail({
                from: `"${config.mailer.from.name}" <${config.mailer.from.email}>`,
                to,
                subject,
                html,
            })

            Logger.info('mailer', `Email sent to ${to}: ${info.messageId}`)
            return info
        } catch (err) {
            Logger.set(err, 'mailer')
            throw err
        }
    }

    /**
     * Verify mailer connection
     * @returns {Promise<boolean>} Connection status
     */
    static async verify() {
        try {
            if (!this.transporter) this.init()
            await this.transporter.verify()
            Logger.info('mailer', 'Mailer connection verified')
            return true
        } catch (err) {
            Logger.set(err, 'mailer')
            return false
        }
    }
}
