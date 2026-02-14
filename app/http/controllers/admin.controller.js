'use strict'

const adminService = require('@app/services/admin.service')
const db = require('@core/database.core')

/**
 * Admin Controller
 * Handles super admin management views and actions
 */
class AdminController {
    /**
     * Render Admin Dashboard
     */
    async dashboard({ req, res }) {
        const stats = await adminService.getGlobalStats()
        const config = require('@app/config')

        return res.render('admin/dashboard', {
            layout: 'layouts/main',
            title: 'Admin Dashboard',
            stats,
            config,
            user: req.user,
            script: ''
        })
    }

    /**
     * Render User Management
     */
    async users({ req, res }) {
        const users = await db.models.User.findAll({
            include: [{ model: db.models.UserSubscription, as: 'subscriptions' }]
        })

        return res.render('admin/users', {
            layout: 'layouts/main',
            title: 'User Management',
            users,
            user: req.user,
            config: require('@app/config'),
            script: ''
        })
    }

    /**
     * Delete user
     */
    async deleteUser({ req, res }) {
        try {
            const { token } = req.params
            const user = await db.models.User.findOne({ where: { token } })

            if (!user) throw new Error('User not found')
            if (user.role === 'SUPER_ADMIN') throw new Error('Cannot delete super admin')

            await user.destroy()

            return res.status(200).json({
                success: true,
                message: 'User deleted successfully'
            })
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Toggle user status (Block/Unblock)
     */
    async toggleUserStatus({ req, res }) {
        try {
            const { token } = req.params
            const { status } = req.body
            const user = await db.models.User.findOne({ where: { token } })

            if (!user) throw new Error('User not found')
            if (user.role === 'SUPER_ADMIN') throw new Error('Cannot block super admin')

            await user.update({ status })

            return res.status(200).json({
                success: true,
                message: `User ${status.toLowerCase()} successfully`
            })
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Render Package Management
     */
    async packages({ req, res }) {
        const packages = await db.models.Package.findAll()

        return res.render('admin/packages', {
            layout: 'layouts/main',
            title: 'Package Management',
            packages,
            user: req.user,
            config: require('@app/config'),
            script: ''
        })
    }

    /**
     * Create package
     */
    async savePackage({ req, res }) {
        try {
            const crypto = require('crypto')
            const data = {
                ...req.body,
                token: crypto.randomBytes(16).toString('hex')
            }
            const pkg = await db.models.Package.create(data)
            return res.status(200).json({ success: true, pkg })
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Update package
     */
    async updatePackage({ req, res }) {
        try {
            const { id } = req.params
            const pkg = await db.models.Package.findByPk(id)
            if (!pkg) throw new Error('Package not found')

            await pkg.update(req.body)
            return res.status(200).json({ success: true, pkg })
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Delete package
     */
    async deletePackage({ req, res }) {
        try {
            const { id } = req.params
            await db.models.Package.destroy({ where: { id } })
            return res.status(200).json({ success: true })
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message })
        }
    }
    /**
     * Get user details for editing
     * GET /api/admin/users/:token
     */
    async getUserData({ req, res }) {
        try {
            const { token } = req.params
            const user = await db.models.User.findOne({
                where: { token },
                include: [
                    {
                        model: db.models.UserSubscription,
                        as: 'subscriptions',
                        include: [{ model: db.models.UserSubscriptionUsage, as: 'usage' }]
                    }
                ]
            })

            if (!user) throw new Error('User not found')

            const packages = await db.models.Package.findAll({ where: { is_active: true } })

            return res.status(200).json({
                success: true,
                user,
                packages
            })
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Update user details (info, subscription, usage)
     * PUT /api/admin/users/:token
     */
    async updateUserData({ req, res }) {
        const transaction = await db.sequelize.transaction()
        try {
            const { token } = req.params
            const { user: userData, subscription: subData, usage: usageData } = req.body

            const user = await db.models.User.findOne({ where: { token } })
            if (!user) throw new Error('User not found')

            // 1. Update User Basic Info
            await user.update(userData, { transaction })

            // 2. Update/Create Subscription
            if (subData) {
                let subscription = await db.models.UserSubscription.findOne({
                    where: { user_token: token, status: 'ACTIVE' }
                })

                if (subscription) {
                    await subscription.update(subData, { transaction })
                } else if (subData.package_token) {
                    // Create new subscription if none active and package provided
                    subscription = await db.models.UserSubscription.create({
                        ...subData,
                        user_token: token,
                        token: require('crypto').randomBytes(16).toString('hex')
                    }, { transaction })
                }

                // 3. Update Usage if subscription exists
                if (subscription && usageData) {
                    let usage = await db.models.UserSubscriptionUsage.findOne({
                        where: { subscription_token: subscription.token }
                    })

                    if (usage) {
                        await usage.update(usageData, { transaction })
                    } else {
                        await db.models.UserSubscriptionUsage.create({
                            ...usageData,
                            subscription_token: subscription.token,
                            user_token: token
                        }, { transaction })
                    }
                }
            }

            await transaction.commit()
            return res.status(200).json({
                success: true,
                message: 'User updated successfully'
            })
        } catch (err) {
            await transaction.rollback()
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Create New User (Admin)
     */
    async createUserData({ req, res }) {
        const transaction = await db.sequelize.transaction()
        try {
            const { user: userData, subscription: subData, usage: usageData } = req.body
            const bcrypt = require('bcrypt')
            const crypto = require('crypto')

            // Check if user exists
            const existing = await db.models.User.findOne({ where: { email: userData.email } })
            if (existing) throw new Error('Email already registered')

            // Setup user token
            if (!userData.password) throw new Error('Password is required')
            userData.token = crypto.randomBytes(16).toString('hex')

            // 1. Create User
            const user = await db.models.User.create(userData, { transaction })

            // 2. Handle Subscription if package selected
            if (subData && subData.package_token) {
                const pkg = await db.models.Package.findOne({ where: { token: subData.package_token } })
                if (!pkg) throw new Error('Invalid package selected')

                const subscriptionToken = require('crypto').randomBytes(16).toString('hex')
                const subscription = await db.models.UserSubscription.create({
                    ...subData,
                    user_token: user.token,
                    token: subscriptionToken,
                    status: 'ACTIVE'
                }, { transaction })

                // 3. Initialize Usage
                await db.models.UserSubscriptionUsage.create({
                    ...(usageData || {}),
                    subscription_token: subscriptionToken,
                    user_token: user.token,
                    remaining_device: usageData?.remaining_device || pkg.limit_device,
                    remaining_api_key: usageData?.remaining_api_key || pkg.limit_generate_api_key,
                    remaining_domain: usageData?.remaining_domain || pkg.limit_domain_whitelist,
                    remaining_message: usageData?.remaining_message || pkg.limit_message
                }, { transaction })
            }

            await transaction.commit()
            return res.status(200).json({
                success: true,
                message: 'User created successfully'
            })
        } catch (err) {
            await transaction.rollback()
            return res.status(400).json({ success: false, message: err.message })
        }
    }
    /**
     * Render Admin Settings
     */
    async settings({ req, res }) {
        const settings = await db.models.Setting.findAll({
            where: { group: 'general' }
        })

        // Convert settings array to object for easier access in template
        const settingsMap = {}
        settings.forEach(s => {
            settingsMap[s.key] = s.value
        })

        const config = require('@app/config')

        return res.render('admin/settings', {
            layout: 'layouts/main',
            title: 'Admin Settings',
            settings: settingsMap,
            user: req.user,
            config,
            script: ''
        })
    }

    /**
     * Update global settings
     * POST /api/admin/settings
     */
    async updateSettings({ req, res }) {
        const transaction = await db.sequelize.transaction()
        try {
            const settings = req.body

            for (const [key, value] of Object.entries(settings)) {
                const [setting] = await db.models.Setting.findOrCreate({
                    where: { key },
                    defaults: {
                        key,
                        value,
                        group: 'general',
                        type: 'STRING'
                    },
                    transaction
                })

                if (setting.value !== value) {
                    await setting.update({ value }, { transaction })
                }
            }

            await transaction.commit()
            return res.status(200).json({
                success: true,
                message: 'Settings updated successfully'
            })
        } catch (err) {
            await transaction.rollback()
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Get user statistics (Admin)
     * GET /api/admin/users/stats
     */
    async getUserStats({ req, res }) {
        try {
            const [total, active, inactive, superAdmin, packages] = await Promise.all([
                db.models.User.count(),
                db.models.User.count({ where: { status: 'ACTIVE' } }),
                db.models.User.count({ where: { status: 'INACTIVE' } }),
                db.models.User.count({ where: { role: 'SUPER_ADMIN' } }),
                db.models.Package.findAll({ where: { is_active: true } })
            ])

            return res.status(200).json({
                success: true,
                stats: {
                    total,
                    active,
                    inactive,
                    super_admin: superAdmin
                },
                packages
            })
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message })
        }
    }

    /**
     * Render Billing & Subscriptions Page
     * GET /admin/billing
     */
    async billing({ req, res }) {
        const stats = await this.getBillingStats()

        return res.render('admin/billing', {
            layout: 'layouts/main',
            title: 'Billing & Subscriptions',
            stats,
            user: req.user,
            config: require('@app/config'),
            script: ''
        })
    }

    /**
     * Get billing statistics API endpoint
     * GET /api/admin/billing/stats
     */
    async getBillingStatsAPI({ req, res }) {
        try {
            const stats = await this.getBillingStats()
            return res.status(200).json({
                success: true,
                stats
            })
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message })
        }
    }

    /**
     * Get billing statistics
     */
    async getBillingStats() {
        const { Op } = db
        const now = new Date()
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        const [activeSubscriptions, expiringSoon, expired, monthlyRevenue] = await Promise.all([
            db.models.UserSubscription.count({
                where: { status: 'ACTIVE' }
            }),
            db.models.UserSubscription.count({
                where: {
                    status: 'ACTIVE',
                    expired_at: {
                        [Op.between]: [now, sevenDaysFromNow]
                    }
                }
            }),
            db.models.UserSubscription.count({
                where: { status: 'EXPIRED' }
            }),
            db.models.UserSubscription.sum('package.price', {
                where: {
                    status: 'ACTIVE',
                    started_at: { [Op.gte]: firstDayOfMonth }
                },
                include: [{
                    model: db.models.Package,
                    as: 'package',
                    attributes: []
                }]
            })
        ])

        return {
            active_subscriptions: activeSubscriptions || 0,
            expiring_soon: expiringSoon || 0,
            expired: expired || 0,
            monthly_revenue: monthlyRevenue || 0
        }
    }

    /**
     * Update subscription
     * PUT /api/admin/subscriptions/:token
     */
    async updateSubscription({ req, res }) {
        try {
            const { token } = req.params
            const { status, expired_at, is_auto_renew } = req.body

            const subscription = await db.models.UserSubscription.findOne({
                where: { token }
            })

            if (!subscription) throw new Error('Subscription not found')

            await subscription.update({
                status,
                expired_at: expired_at ? new Date(expired_at) : subscription.expired_at,
                is_auto_renew: is_auto_renew !== undefined ? is_auto_renew : subscription.is_auto_renew
            })

            return res.status(200).json({
                success: true,
                message: 'Subscription updated successfully'
            })
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Get billing analytics data
     * GET /api/admin/billing/analytics
     */
    async getBillingAnalytics({ req, res }) {
        try {
            // Package distribution
            const packageDistribution = await db.models.UserSubscription.findAll({
                attributes: [
                    [db.Sequelize.fn('COUNT', db.Sequelize.col('UserSubscription.id')), 'count']
                ],
                include: [{
                    model: db.models.Package,
                    as: 'package',
                    attributes: ['name']
                }],
                where: { status: 'ACTIVE' },
                group: ['package.id'],
                raw: true
            })

            // Revenue by package
            const revenueByPackage = await db.models.UserSubscription.findAll({
                attributes: [
                    [db.Sequelize.fn('SUM', db.Sequelize.col('package.price')), 'revenue']
                ],
                include: [{
                    model: db.models.Package,
                    as: 'package',
                    attributes: ['name']
                }],
                where: { status: 'ACTIVE' },
                group: ['package.id'],
                raw: true
            })

            return res.status(200).json({
                success: true,
                package_distribution: packageDistribution.map(p => ({
                    name: p['package.name'],
                    count: parseInt(p.count)
                })),
                revenue_by_package: revenueByPackage.map(p => ({
                    name: p['package.name'],
                    revenue: parseFloat(p.revenue || 0)
                }))
            })
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message })
        }
    }

    /**
     * Get top usage data
     * GET /api/admin/billing/top-usage
     */
    async getTopUsage({ req, res }) {
        try {
            const users = await db.models.User.findAll({
                attributes: ['name', 'email', 'token'],
                include: [
                    {
                        model: db.models.UserSubscription,
                        as: 'subscriptions',
                        where: { status: 'ACTIVE' },
                        required: true,
                        include: [
                            {
                                model: db.models.Package,
                                as: 'package',
                                attributes: ['name', 'limit_device', 'limit_message']
                            },
                            {
                                model: db.models.UserSubscriptionUsage,
                                as: 'usage',
                                attributes: ['remaining_device', 'remaining_message']
                            }
                        ]
                    }
                ],
                limit: 20
            })

            const usageData = await Promise.all(users.map(async user => {
                const sub = user.subscriptions[0]
                const pkg = sub.package
                const usage = sub.usage

                // Count devices
                const deviceCount = await db.models.UserDevice.count({
                    where: { user_token: user.token }
                })

                // Count today's messages
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const messagesToday = await db.models.MessageHistory.count({
                    where: {
                        user_token: user.token,
                        sent_at: { [db.Sequelize.Op.gte]: today }
                    }
                })

                return {
                    name: user.name,
                    email: user.email,
                    package: pkg.name,
                    devices: deviceCount,
                    messages_today: messagesToday,
                    api_calls_today: 0, // Placeholder
                    usage: messagesToday,
                    limit: pkg.limit_message === -1 ? 999999 : pkg.limit_message
                }
            }))

            return res.status(200).json(usageData)
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message })
        }
    }

    /**
     * Get usage remaining datatable (Admin)
     * POST /api/admin/datatable/usage-remaining
     */
    async getUsageRemainingDataTable({ req, res }) {
        try {
            const { Op } = db
            
            // Get all users with active subscriptions
            const users = await db.models.User.findAll({
                attributes: ['name', 'email', 'token'],
                include: [
                    {
                        model: db.models.UserSubscription,
                        as: 'subscriptions',
                        where: { status: 'ACTIVE' },
                        required: true,
                        include: [
                            {
                                model: db.models.Package,
                                as: 'package',
                                attributes: ['name', 'limit_device', 'limit_message', 'limit_generate_api_key', 'limit_domain_whitelist']
                            },
                            {
                                model: db.models.UserSubscriptionUsage,
                                as: 'usage',
                                attributes: ['remaining_device', 'remaining_message', 'remaining_api_key', 'remaining_domain']
                            }
                        ]
                    }
                ]
            })

            // Build usage data for each user
            const usageData = await Promise.all(users.map(async user => {
                const sub = user.subscriptions[0]
                const pkg = sub.package
                const usage = sub.usage

                // Count devices
                const deviceCount = await db.models.UserDevice.count({
                    where: { user_token: user.token },
                    include: [{
                        model: db.models.Device,
                        as: 'device',
                        where: { is_deleted: false },
                        required: true
                    }]
                })

                // Count today's messages
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const messagesToday = await db.models.MessageHistory.count({
                    where: {
                        user_token: user.token,
                        sent_at: { [Op.gte]: today }
                    }
                })

                // Calculate usage percentage (based on devices)
                const deviceLimit = pkg.limit_device === -1 ? 999999 : pkg.limit_device
                const usagePercent = deviceLimit > 0 ? (deviceCount / deviceLimit * 100) : 0

                return {
                    user: {
                        name: user.name,
                        email: user.email
                    },
                    package: {
                        name: pkg.name,
                        device_limit: pkg.limit_device
                    },
                    devices_used: deviceCount,
                    messages_today: messagesToday,
                    api_calls_today: 0, // Placeholder - implement if you have API call tracking
                    usage: deviceCount,
                    limit: deviceLimit,
                    usage_percent: usagePercent.toFixed(1)
                }
            }))

            // Sort by usage percentage descending
            usageData.sort((a, b) => parseFloat(b.usage_percent) - parseFloat(a.usage_percent))

            // Apply DataTables pagination manually
            const params = req.body
            const start = parseInt(params.start) || 0
            const length = parseInt(params.length) || 25
            const pagedData = usageData.slice(start, start + length)

            return res.status(200).json({
                draw: parseInt(params.draw) || 1,
                recordsTotal: usageData.length,
                recordsFiltered: usageData.length,
                data: pagedData
            })
        } catch (error) {
            console.error('[AdminController] getUsageRemainingDataTable error:', error)
            return res.status(500).json({ success: false, message: error.message })
        }
    }

    /**
     * Export billing report
     * GET /api/admin/billing/export
     */
    async exportBillingReport({ req, res }) {
        try {
            const subscriptions = await db.models.UserSubscription.findAll({
                include: [
                    {
                        model: db.models.User,
                        as: 'user',
                        attributes: ['name', 'email'],
                        required: false
                    },
                    {
                        model: db.models.Package,
                        as: 'package',
                        attributes: ['name', 'price', 'period'],
                        required: false
                    }
                ],
                searchableColumns: ['user.name', 'user.email', 'package.name'],
                customFilters,
                order: [['createdAt', 'DESC']]
            })

            // Create CSV
            let csv = 'Date,User,Email,Package,Period,Price,Status,Started,Expires\n'
            subscriptions.forEach(sub => {
                const userName = sub.user ? sub.user.name : 'N/A'
                const userEmail = sub.user ? sub.user.email : 'N/A'
                const packageName = sub.package ? sub.package.name : 'N/A'
                const packagePeriod = sub.package ? sub.package.period : 'N/A'
                const packagePrice = sub.package ? sub.package.price : 0

                csv += `${new Date(sub.createdAt).toISOString().split('T')[0]},`
                csv += `"${userName}",`
                csv += `${userEmail},`
                csv += `"${packageName}",`
                csv += `${packagePeriod},`
                csv += `${packagePrice},`
                csv += `${sub.status},`
                csv += `${new Date(sub.started_at).toISOString().split('T')[0]},`
                csv += `${new Date(sub.expired_at).toISOString().split('T')[0]}\n`
            })

            res.setHeader('Content-Type', 'text/csv')
            res.setHeader('Content-Disposition', 'attachment; filename=billing-report.csv')
            return res.send(csv)
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message })
        }
    }
}

module.exports = AdminController
