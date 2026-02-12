'use strict'

require('module-alias/register')
const db = require('@core/database.core')

async function checkData() {
    try {
        await db.init()

        const usages = await db.models.UserSubscriptionUsage.findAll()
        console.log('--- UserSubscriptionUsage ---')
        console.table(usages.map(u => ({
            id: u.id,
            subscription_token: u.subscription_token,
            user_token: u.user_token,
            remaining_api_key: u.remaining_api_key
        })))

        const users = await db.models.User.findAll()
        console.log('\n--- Users ---')
        console.table(users.map(u => ({
            name: u.name,
            token: u.token,
            role: u.role
        })))

    } catch (err) {
        console.error(err)
    } finally {
        await db.close()
    }
}

checkData()
