'use strict'

require('module-alias/register')
const db = require('@core/database.core')

async function fix() {
    try {
        await db.init()
        console.log('Database initialized')

        // Drop webhooks table to force recreation with new schema (user_token added)
        await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0')
        await db.sequelize.query('DROP TABLE IF EXISTS webhooks')
        await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1')

        console.log('Table webhooks dropped successfully')
        process.exit(0)
    } catch (err) {
        console.error('Failed to fix webhooks table', err)
        process.exit(1)
    }
}

fix()
