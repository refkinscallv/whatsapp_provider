'use strict'

require('module-alias/register')
const db = require('@core/database.core')
const Hash = require('@core/helpers/hash.helper')

async function seed() {
    try {
        await db.init()
        const { User, Package } = db.models

        console.log('Seeding database...')

        // 1. Create Default Packages
        const packages = [
            {
                token: Hash.token(),
                name: 'Free',
                currency: 'IDR',
                price: 0,
                period_amount: '1',
                period: 'MONTHLY',
                limit_device: 1,
                limit_message: 100,
                limit_generate_api_key: 1,
                limit_domain_whitelist: 1,
                is_active: true,
                features: ['1 Device', '100 Messages/Day', '1 API Key', 'Community Support']
            },
            {
                token: Hash.token(),
                name: 'Pro',
                currency: 'IDR',
                price: 50000,
                period_amount: '1',
                period: 'MONTHLY',
                limit_device: 5,
                limit_message: 5000,
                limit_generate_api_key: 10,
                limit_domain_whitelist: 10,
                is_active: true,
                features: ['5 Devices', '5000 Messages/Day', '10 API Keys', 'API Access', 'Email Support']
            },
            {
                token: Hash.token(),
                name: 'Enterprise',
                currency: 'IDR',
                price: 250000,
                period_amount: '1',
                period: 'YEARLY',
                limit_device: 20,
                limit_message: 100000,
                limit_generate_api_key: 100,
                limit_domain_whitelist: 100,
                is_active: true,
                features: ['20 Devices', 'Unlimited Messages', 'Unlimited API Keys', 'Priority Support', 'Custom Integration']
            }
        ]

        for (const pkg of packages) {
            const [record, created] = await Package.findOrCreate({
                where: { name: pkg.name },
                defaults: pkg
            })
            if (!created) {
                await record.update(pkg)
            }
        }
        console.log('Packages seeded.')

        // 2. Create Super Admin
        const adminWhatsapp = '62895392168277'
        const adminPassword = 'admin123'

        const [admin, created] = await User.findOrCreate({
            where: { whatsapp: adminWhatsapp },
            defaults: {
                token: Hash.token(),
                name: 'Super Admin',
                email: 'admin@warf.com',
                whatsapp: adminWhatsapp,
                password: adminPassword, // Will be hashed by model hook
                status: 'ACTIVE',
                user_type: 'COMPANY',
                is_admin: true,
                role: 'SUPER_ADMIN'
            }
        })

        if (created) {
            console.log(`Super Admin created: ${adminWhatsapp} / ${adminPassword}`)
        } else {
            // Update password in case it was double hashed
            await admin.update({ password: adminPassword })
            console.log(`Super Admin updated/exists: ${adminWhatsapp}`)
        }

        console.log('Note: Super Admin does not require a subscription.')

        // 4. Self-healing: Initialize usage for any user missing it
        const subsWithoutUsage = await db.models.UserSubscription.findAll({
            include: [
                { model: db.models.UserSubscriptionUsage, as: 'usage', required: false },
                { model: db.models.Package, as: 'package' }
            ],
            where: { '$usage.id$': null }
        })

        for (const sub of subsWithoutUsage) {
            await db.models.UserSubscriptionUsage.create({
                subscription_token: sub.token,
                user_token: sub.user_token,
                remaining_device: sub.package.limit_device || 0,
                remaining_message: sub.package.limit_message || 0,
                remaining_api_key: sub.package.limit_generate_api_key || 0,
                remaining_domain: sub.package.limit_domain_whitelist || 0,
                last_reset_at: new Date()
            })
            console.log(`Initialized usage for subscription: ${sub.token}`)
        }

        // 5. Self-healing: Fix missing user_token and 0 limits for existing records
        const allUsages = await db.models.UserSubscriptionUsage.findAll({
            include: [{
                model: db.models.UserSubscription,
                as: 'subscription',
                include: [{ model: db.models.Package, as: 'package' }]
            }]
        })

        for (const usage of allUsages) {
            const updates = {}
            if (!usage.user_token && usage.subscription) {
                updates.user_token = usage.subscription.user_token
            }
            // If limits are 0 but package has limits, refill them
            if (usage.subscription && usage.subscription.package) {
                const pkg = usage.subscription.package
                if (usage.remaining_api_key === 0 && pkg.limit_generate_api_key > 0) updates.remaining_api_key = pkg.limit_generate_api_key
                if (usage.remaining_domain === 0 && pkg.limit_domain_whitelist > 0) updates.remaining_domain = pkg.limit_domain_whitelist
                if (usage.remaining_device === 0 && pkg.limit_device > 0) updates.remaining_device = pkg.limit_device
                if (usage.remaining_message === 0 && pkg.limit_message > 0) updates.remaining_message = pkg.limit_message
            }

            if (Object.keys(updates).length > 0) {
                await usage.update(updates)
                console.log(`Healed usage record ID ${usage.id}:`, updates)
            }
        }

        console.log('Seeding completed successfully.')
        return true
    } catch (err) {
        console.error('Seeding failed:', err)
        throw err
    }
}

if (require.main === module) {
    seed()
        .then(() => process.exit(0))
        .catch(() => process.exit(1))
}

module.exports = seed
