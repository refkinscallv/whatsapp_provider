'use strict'

const authService = require('@app/services/auth.service')

/**
 * Authentication Controller
 * Handles user registration, login, and profile management
 */
class AuthController {
    /**
     * Register a new user
     * POST /api/auth/register
     */
    async register({ req, res }) {
        try {
            const { name, email, whatsapp, password, user_type } = req.body

            // Validate required fields
            if (!name || !email || !whatsapp || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, email, whatsapp, and password are required',
                })
            }

            const result = await authService.register({
                name,
                email,
                whatsapp,
                password,
                user_type,
            })

            // Set token in cookie
            res.cookie('token', result.token, {
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            })

            return res.status(201).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Login user
     * POST /api/auth/login
     */
    async login({ req, res }) {
        try {
            const { identifier, password } = req.body

            // Validate required fields
            if (!identifier || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email/WhatsApp and password are required',
                })
            }

            const result = await authService.login(identifier, password)

            // Set token in cookie
            res.cookie('token', result.token, {
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            })

            return res.status(200).json(result)
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Logout user
     * POST /api/auth/logout
     */
    async logout({ req, res }) {
        try {
            res.clearCookie('token')

            return res.status(200).json({
                success: true,
                message: 'Logged out successfully',
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Get current user
     * GET /api/auth/me
     */
    async me({ req, res }) {
        try {
            const user = await authService.getUserByToken(req.user.token)

            return res.status(200).json({
                success: true,
                user: {
                    token: user.token,
                    name: user.name,
                    email: user.email,
                    whatsapp: user.whatsapp,
                    user_type: user.user_type,
                    status: user.status,
                    is_admin: user.is_admin,
                },
            })
        } catch (err) {
            return res.status(404).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Update profile
     * PUT /api/auth/profile
     */
    async updateProfile({ req, res }) {
        try {
            const { name, whatsapp, user_type } = req.body

            const result = await authService.updateProfile(req.user.token, {
                name,
                whatsapp,
                user_type,
            })

            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Change password
     * POST /api/auth/change-password
     */
    async changePassword({ req, res }) {
        try {
            const { oldPassword, newPassword } = req.body

            if (!oldPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Old password and new password are required',
                })
            }

            const result = await authService.changePassword(req.user.token, oldPassword, newPassword)

            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Request password reset
     * POST /api/auth/forgot-password
     */
    async forgotPassword({ req, res }) {
        try {
            const { email } = req.body
            if (!email) throw new Error('Email is required')

            const result = await authService.forgotPassword(email)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Reset password
     * POST /api/auth/reset-password
     */
    async resetPassword({ req, res }) {
        try {
            const { token, password } = req.body
            if (!token || !password) throw new Error('Token and password are required')

            const result = await authService.resetPassword(token, password)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Verify email
     * GET /api/auth/verify-email
     */
    async verifyEmail({ req, res }) {
        try {
            const { token } = req.query
            if (!token) throw new Error('Token is required')

            const result = await authService.verifyEmail(token)

            // If it's a web request, we might want to redirect
            if (req.accepts('html')) {
                return res.render('auth/verify-success', { title: 'Email Verified', message: result.message })
            }

            return res.status(200).json(result)
        } catch (err) {
            if (req.accepts('html')) {
                return res.render('auth/verify-error', { title: 'Verification Failed', message: err.message })
            }
            return res.status(400).json({ success: false, message: err.message })
        }
    }
}

module.exports = AuthController
