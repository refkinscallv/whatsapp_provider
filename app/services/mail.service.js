'use strict'

const Mailer = require('@core/mailer.core')
const Logger = require('@core/logger.core')

/**
 * Mail Service
 * High-level service for application email notifications
 */
class MailService {
    /**
     * Send welcome email to a new user
     * @param {object} user - User model instance
     * @returns {Promise<boolean>}
     */
    async sendWelcomeEmail(user) {
        try {
            await Mailer.send(user.email, `Welcome to Wanine WhatsApp Gateway!`, 'welcome', {
                name: user.name,
                email: user.email,
            })
            return true
        } catch (err) {
            Logger.error(`Failed to send welcome email to ${user.email}`, err)
            return false
        }
    }

    /**
     * Send email verification link
     * @param {string} email - Recipient email
     * @param {string} name - Recipient name
     * @param {string} token - Verification token
     * @returns {Promise<boolean>}
     */
    async sendVerificationEmail(email, name, token) {
        try {
            await Mailer.send(email, 'Verify Your Email Address', 'verify-email', {
                name,
                token,
            })
            return true
        } catch (err) {
            Logger.error(`Failed to send verification email to ${email}`, err)
            return false
        }
    }

    /**
     * Send password reset link
     * @param {string} email - Recipient email
     * @param {string} name - Recipient name
     * @param {string} token - Reset token
     * @returns {Promise<boolean>}
     */
    async sendResetPasswordEmail(email, name, token) {
        try {
            await Mailer.send(email, 'Reset Your Password', 'reset-password', {
                name,
                token,
            })
            return true
        } catch (err) {
            Logger.error(`Failed to send reset password email to ${email}`, err)
            return false
        }
    }

    /**
     * Send test email to verify configuration
     * @param {string} to - Recipient email
     * @returns {Promise<boolean>}
     */
    async sendTestEmail(to) {
        try {
            await Mailer.send(to, 'Test Email - Mailer Configuration Verified', 'test', {
                timestamp: new Date().toISOString(),
            })
            return true
        } catch (err) {
            Logger.error(`Failed to send test email to ${to}`, err)
            throw err
        }
    }
}

module.exports = new MailService()
