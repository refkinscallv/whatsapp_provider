'use strict'

const db = require('@core/database.core')
const jwt = require('@core/jwt.core')
const mailService = require('./mail.service')
const subscriptionService = require('./subscription.service')
const Hash = require('@core/helpers/hash.helper')

/**
 * Authentication Service
 * Handles user registration, login, and JWT token management
 */
class AuthService {
    /**
     * Register a new user
     * @param {object} userData - User registration data
     * @returns {Promise<object>}
     */
    async register(userData) {
        // Mode check
        const appModeService = require('./appMode.service')
        const appMode = await appModeService.getMode()

        if (appMode === 'DASHBOARD') {
            const userCount = await db.models.User.count()
            if (userCount > 0) {
                throw new Error('Registration is disabled. Please contact the administrator.')
            }
        }

        const { name, email, whatsapp, password, user_type = 'PERSONAL' } = userData

        // Check if user already exists
        const existingUser = await db.models.User.findOne({
            where: {
                [db.Op.or]: [{ email }, { whatsapp }],
            },
        })

        if (existingUser) {
            if (existingUser.email === email) {
                throw new Error('Email already registered')
            }
            if (existingUser.whatsapp === whatsapp) {
                throw new Error('WhatsApp number already registered')
            }
        }

        // Normalize whatsapp number
        const normalizedWhatsapp = whatsapp.replace(/\D/g, '')

        // Create user
        const user = await db.models.User.create({
            token: Hash.token(),
            name,
            email,
            whatsapp: normalizedWhatsapp,
            password, // Will be hashed by model hook
            user_type,
            status: 'ACTIVE',
            is_admin: false,
            role: 'MEMBER'
        })

        // Send welcome email (async - don't wait for it to finish)
        mailService.sendWelcomeEmail(user).catch(err => {
            console.error('Failed to send welcome email:', err)
        })

        // Handle Subscription based on Mode
        const isSaaS = await appModeService.isSubscriptionEnabled()

        if (isSaaS) {
            // 1. Find Free Package
            const freePkg = await db.models.Package.findOne({ where: { name: 'Free' } })
            if (freePkg) {
                const expiresAt = new Date()
                expiresAt.setMonth(expiresAt.getMonth() + 1) // Default 1 month

                // 2. Create Subscription
                const subscription = await db.models.UserSubscription.create({
                    token: Hash.token(),
                    user_token: user.token,
                    package_token: freePkg.token,
                    status: 'ACTIVE',
                    started_at: new Date(),
                    expired_at: expiresAt
                })

                // 3. Initialize Usage
                await this.initializeUsage(user.token, subscription.token, freePkg)
            }
        }

        // Generate JWT token
        const token = jwt.sign({
            token: user.token,
            email: user.email,
            is_admin: user.is_admin,
            role: user.role
        })

        return {
            success: true,
            message: 'User registered successfully',
            user: {
                token: user.token,
                name: user.name,
                email: user.email,
                whatsapp: user.whatsapp,
                user_type: user.user_type,
                status: user.status,
                is_admin: user.is_admin,
            },
            token,
        }
    }

    /**
     * Login user
     * @param {string} identifier - Email or WhatsApp number
     * @param {string} password - User password
     * @returns {Promise<object>}
     */
    async login(identifier, password) {
        // Normalize identifier if phone (strip symbols)
        const normalizedIdentifier = !identifier.includes('@') ? identifier.replace(/\D/g, '') : identifier

        // Find user by email or whatsapp
        const user = await db.models.User.findOne({
            where: {
                [db.Op.or]: [{ email: identifier }, { whatsapp: normalizedIdentifier }],
            },
        })

        if (!user) {
            throw new Error('Invalid credentials')
        }

        // Check password
        const isValidPassword = await user.comparePassword(password)
        if (!isValidPassword) {
            throw new Error('Invalid credentials')
        }

        // Check if user is active
        if (user.status !== 'ACTIVE') {
            throw new Error(`Account is ${user.status.toLowerCase()}`)
        }

        // Generate JWT token
        const token = jwt.sign({
            token: user.token,
            email: user.email,
            is_admin: user.is_admin,
            role: user.role
        })

        return {
            success: true,
            message: 'Login successful',
            user: {
                token: user.token,
                name: user.name,
                email: user.email,
                whatsapp: user.whatsapp,
                user_type: user.user_type,
                status: user.status,
                is_admin: user.is_admin,
            },
            token,
        }
    }

    /**
     * Get user by token
     * @param {string} userToken - User token
     * @returns {Promise<object>}
     */
    async getUserByToken(userToken) {
        const user = await db.models.User.findOne({
            where: { token: userToken },
            attributes: { exclude: ['password'] },
        })

        if (!user) {
            throw new Error('User not found')
        }

        return user
    }

    /**
     * Verify JWT token
     * @param {string} token - JWT token
     * @returns {object}
     */
    verifyToken(token) {
        return jwt.verify(token)
    }

    /**
     * Update user profile
     * @param {string} userToken - User token
     * @param {object} updateData - Data to update
     * @returns {Promise<object>}
     */
    async updateProfile(userToken, updateData) {
        const user = await db.models.User.findOne({
            where: { token: userToken },
        })

        if (!user) {
            throw new Error('User not found')
        }

        // Only allow updating certain fields
        const allowedFields = ['name', 'whatsapp', 'user_type']
        const filteredData = {}

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                filteredData[field] = updateData[field]
            }
        }

        await user.update(filteredData)

        return {
            success: true,
            message: 'Profile updated successfully',
            user: {
                token: user.token,
                name: user.name,
                email: user.email,
                whatsapp: user.whatsapp,
                user_type: user.user_type,
                status: user.status,
            },
        }
    }

    /**
     * Change password
     * @param {string} userToken - User token
     * @param {string} oldPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<object>}
     */
    async changePassword(userToken, oldPassword, newPassword) {
        const user = await db.models.User.findOne({
            where: { token: userToken },
        })

        if (!user) {
            throw new Error('User not found')
        }

        // Verify old password
        const isValidPassword = await user.comparePassword(oldPassword)
        if (!isValidPassword) {
            throw new Error('Invalid current password')
        }

        // Update password
        await user.update({ password: newPassword })

        return {
            success: true,
            message: 'Password changed successfully',
        }
    }

    /**
     * Initiate password reset
     * @param {string} email - User email
     * @returns {Promise<object>}
     */
    async forgotPassword(email) {
        const user = await db.models.User.findOne({ where: { email } })
        if (!user) {
            // We return success even if user not found for security reasons
            return { success: true, message: 'If the email exists, a reset link will be sent.' }
        }

        const token = Hash.token()
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 1) // 1 hour expiry

        await db.models.UserResetPassword.create({
            token,
            user_token: user.token,
            email: user.email,
            expired_at: expiresAt
        })

        // Send email
        await mailService.sendResetPasswordEmail(user.email, user.name, token)

        return {
            success: true,
            message: 'Reset password link sent to your email'
        }
    }

    /**
     * Reset password using token
     * @param {string} token - Reset token
     * @param {string} newPassword - New password
     * @returns {Promise<object>}
     */
    async resetPassword(token, newPassword) {
        const resetRecord = await db.models.UserResetPassword.findOne({
            where: {
                token,
                is_used: false,
                expired_at: { [db.Op.gt]: new Date() }
            }
        })

        if (!resetRecord) {
            throw new Error('Invalid or expired reset token')
        }

        const user = await db.models.User.findOne({ where: { token: resetRecord.user_token } })
        if (!user) throw new Error('User not found')

        // Update user password
        await user.update({ password: newPassword })

        // Mark token as used
        await resetRecord.update({ is_used: true })

        return {
            success: true,
            message: 'Password has been reset successfully'
        }
    }

    /**
     * Verify email using token
     * @param {string} token - Verification token
     * @returns {Promise<object>}
     */
    async verifyEmail(token) {
        const verifyRecord = await db.models.UserEmailVerification.findOne({
            where: {
                token,
                is_used: false,
                expired_at: { [db.Op.gt]: new Date() }
            }
        })

        if (!verifyRecord) {
            throw new Error('Invalid or expired verification token')
        }

        const user = await db.models.User.findOne({ where: { token: verifyRecord.user_token } })
        if (!user) throw new Error('User not found')

        // Update user status
        await user.update({ status: 'ACTIVE' })

        // Mark token as used
        await verifyRecord.update({ is_used: true })

        return {
            success: true,
            message: 'Email verified successfully'
        }
    }

    /**
     * Initialize usage for a user subscription
     * @param {string} userToken - User token
     * @param {string} subscriptionToken - Subscription token
     * @param {object} pkg - Package data
     */
    async initializeUsage(userToken, subscriptionToken, pkg) {
        return await db.models.UserSubscriptionUsage.create({
            subscription_token: subscriptionToken,
            user_token: userToken,
            remaining_device: pkg.limit_device || 0,
            remaining_message: pkg.limit_message || 0,
            remaining_api_key: pkg.limit_generate_api_key || 0,
            remaining_domain: pkg.limit_domain_whitelist || 0,
            last_reset_at: new Date()
        })
    }
}

module.exports = new AuthService()
