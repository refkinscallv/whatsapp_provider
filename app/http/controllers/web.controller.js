'use strict'

const config = require('@app/config')
const appModeService = require('@app/services/appMode.service')

/**
 * Web Controller
 * Handles rendering of EJS views
 */
class WebController {
    /**
     * Render Login Page
     */
    async login({ res }) {
        return res.render('auth/login', {
            layout: 'layouts/auth',
            title: 'Login',
            config
        })
    }

    /**
     * Render Register Page
     */
    async register({ res }) {
        const appMode = await appModeService.getMode()
        if (appMode === 'DASHBOARD') {
            const db = require('@core/database.core')
            const userCount = await db.models.User.count()
            if (userCount > 0) {
                return res.redirect('/login')
            }
        }

        return res.render('auth/register', {
            layout: 'layouts/auth',
            title: 'Register',
            config
        })
    }

    /**
     * Render Forgot Password Page
     */
    async forgotPassword({ res }) {
        return res.render('auth/forgot-password', {
            layout: 'layouts/auth',
            title: 'Forgot Password',
            config
        })
    }

    /**
     * Render Reset Password Page
     */
    async resetPassword({ req, res }) {
        return res.render('auth/reset-password', {
            layout: 'layouts/auth',
            title: 'Reset Password',
            config,
            token: req.query.token
        })
    }

    /**
     * Render Dashboard Page
     */
    async dashboard({ req, res }) {
        return res.render('dashboard/index', {
            layout: 'layouts/main',
            title: 'Dashboard',
            config,
            userToken: req.user?.token,
            isSubscriptionEnabled: await appModeService.isSubscriptionEnabled(),
            script: ''
        })
    }

    /**
     * Render Device Management Page
     */
    async devices({ req, res }) {
        return res.render('devices/index', {
            layout: 'layouts/main',
            title: 'Devices',
            config,
            userToken: req.user?.token,
            script: ''
        })
    }

    /**
     * Render Messaging Page
     */
    async messaging({ req, res }) {
        const isAdmin = req.user?.role === 'SUPER_ADMIN'
        const metadata = req.user?.metadata || {}
        const settings = metadata.settings || {}

        // Settings-based visibility
        const showQueueToggle = settings.enable_manual_queue === true || settings.enable_manual_queue === 'true'

        return res.render('messaging/index', {
            layout: 'layouts/main',
            title: 'Messaging',
            config,
            userToken: req.user?.token,
            showQueueToggle: isAdmin || showQueueToggle,
            script: ''
        })
    }

    /**
     * Render Contacts Page
     */
    async contacts({ req, res }) {
        return res.render('contacts/index', {
            layout: 'layouts/main',
            title: 'Contacts',
            config,
            userToken: req.user?.token,
            script: ''
        })
    }

    /**
     * Render Message History Page
     */
    async history({ req, res }) {
        return res.render('history/index', {
            layout: 'layouts/main',
            title: 'Message History',
            config,
            userToken: req.user?.token,
            script: ''
        })
    }

    /**
     * Render Templates Page
     */
    async templates({ req, res }) {
        return res.render('templates/index', {
            layout: 'layouts/main',
            title: 'Templates',
            config,
            userToken: req.user?.token,
            script: ''
        })
    }

    /**
     * Render Auto Reply Page
     */
    async autoReplies({ req, res }) {
        return res.render('auto-replies/index', {
            layout: 'layouts/main',
            title: 'Auto Reply',
            config,
            userToken: req.user?.token,
            script: ''
        })
    }

    /**
     * Render AI Sessions Page
     */
    async aiSessions({ req, res }) {
        return res.render('ai-sessions/index', {
            layout: 'layouts/main',
            title: 'AI Automation',
            config,
            userToken: req.user?.token,
            isSubscriptionEnabled: await appModeService.isSubscriptionEnabled(),
            script: ''
        })
    }

    /**
     * Render Campaigns Page
     */
    async campaigns({ req, res }) {
        return res.render('campaigns/index', {
            layout: 'layouts/main',
            title: 'Campaigns',
            config,
            userToken: req.user?.token,
            script: ''
        })
    }

    /**
     * Render Scheduled Messages Page
     */
    async scheduledMessages({ req, res }) {
        return res.render('scheduled-messages/index', {
            layout: 'layouts/main',
            title: 'Scheduled Messages',
            config,
            userToken: req.user?.token,
            script: ''
        })
    }

    /**
     * Render Number Checker Tool Page
     */
    async toolsNumberChecker({ req, res }) {
        return res.render('tools/number_checker', {
            layout: 'layouts/main',
            title: 'Number Checker',
            config,
            userToken: req.user?.token,
            script: ''
        })
    }

    /**
     * Render Settings Page
     */
    async settings({ req, res }) {
        const db = require('@core/database.core')
        const isAdmin = req.user?.role === 'SUPER_ADMIN'

        // Plan status
        const subscription = await db.models.UserSubscription.findOne({
            where: { user_token: req.user?.token, status: 'ACTIVE' },
            include: [{ model: db.models.Package, as: 'package' }]
        })
        const isFree = (subscription?.package?.name || 'Free').toLowerCase() === 'free'

        return res.render('settings/index', {
            layout: 'layouts/main',
            title: 'Settings',
            config,
            canDirectSend: isAdmin || !isFree,
            isSubscriptionEnabled: await appModeService.isSubscriptionEnabled(),
            script: ''
        })
    }

    /**
     * Render Landing Page
     */
    async landing({ res }) {
        const db = require('@core/database.core')
        const packages = await db.models.Package.findAll({ where: { is_active: true } })

        // Fetch Stats
        const counts = {
            users: await db.models.User.count(),
            devices: await db.models.Device.count(),
            messages: await db.models.MessageHistory.count()
        }

        return res.render('pages/landing', {
            layout: false,
            title: 'Welcome',
            config,
            packages,
            stats: counts
        })
    }

    /**
     * Render About Page
     */
    async about({ res }) {
        return res.render('pages/about', {
            layout: 'layouts/auth', // Use auth layout as it's cleaner for simple pages
            title: 'About Us',
            config
        })
    }

    /**
     * Render Contact Page
     */
    async contact({ res }) {
        return res.render('pages/contact', {
            layout: 'layouts/auth',
            title: 'Contact Us',
            config
        })
    }

    /**
     * Render Privacy Policy Page
     */
    async privacy({ res }) {
        return res.render('pages/privacy', {
            layout: 'layouts/auth',
            title: 'Privacy Policy',
            config
        })
    }

    /**
     * Render Terms of Service Page
     */
    async tos({ res }) {
        return res.render('pages/tos', {
            layout: 'layouts/auth',
            title: 'Terms of Service',
            config
        })
    }

    /**
     * Render Cookie Policy Page
     */
    async cookies({ res }) {
        return res.render('pages/cookies', {
            layout: 'layouts/auth',
            title: 'Cookie Policy',
            config
        })
    }

    /**
     * Render Pricing Page (Guest)
     */
    async pricing({ res }) {
        const db = require('@core/database.core')
        const packages = await db.models.Package.findAll({ where: { is_active: true } })

        return res.render('pages/pricing', {
            layout: 'layouts/auth',
            title: 'Pricing Plans',
            config,
            packages,
            isDashboard: false
        })
    }

    /**
     * Render Billing/Upgrade Page (Dashboard)
     */
    async billing({ req, res }) {
        const db = require('@core/database.core')
        const packages = await db.models.Package.findAll({ where: { is_active: true } })

        return res.render('pages/pricing', {
            layout: 'layouts/main',
            title: 'Billing & Plans',
            config,
            packages,
            userToken: req.user?.token,
            isDashboard: true,
            script: ''
        })
    }

    /**
     * Render API Docs Page
     */
    async docs({ req, res }) {
        return res.render('pages/docs', {
            layout: 'layouts/main',
            title: 'API Documentation',
            config,
            userToken: req.user?.token,
            script: ''
        })
    }
}

module.exports = WebController
