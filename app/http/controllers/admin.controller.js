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
            const pkg = await db.models.Package.create(req.body)
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
}

module.exports = AdminController
