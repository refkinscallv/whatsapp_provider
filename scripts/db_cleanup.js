'use strict'

require('module-alias/register')
const db = require('@core/database.core')
const config = require('@app/config')

const { Sequelize } = require('sequelize')

/**
 * DB Cleanup Script
 * Identifies and drops redundant/anonymous unique indexes
 */
async function cleanup() {
    try {
        console.log('--- Database Cleanup Started ---')

        const sequelize = new Sequelize(
            config.database.database,
            config.database.username,
            config.database.password,
            {
                host: config.database.host,
                port: config.database.port,
                dialect: config.database.dialect,
                logging: false,
                timezone: config.database.timezone,
            }
        )

        await sequelize.authenticate()
        console.log('Database connection established (skipping sync)')

        const tables = [
            { name: 'users', expected: ['idx_user_token', 'idx_user_whatsapp', 'idx_user_email', 'idx_user_admin', 'idx_user_status', 'idx_user_type', 'PRIMARY'] },
            { name: 'api_keys', expected: ['idx_apikey_token', 'idx_apikey_key', 'idx_apikey_user', 'idx_apikey_active', 'PRIMARY'] },
            { name: 'devices', expected: ['idx_device_token', 'idx_device_status', 'idx_device_status_single', 'PRIMARY'] },
            { name: 'packages', expected: ['idx_pkgs_token', 'idx_pkgs_active', 'idx_pkgs_currency', 'idx_pkgs_price', 'idx_pkgs_period_amount', 'idx_pkgs_period', 'PRIMARY'] },
            { name: 'campaigns', expected: ['idx_campaign_token', 'idx_campaign_device', 'idx_campaign_user', 'idx_campaign_status', 'idx_campaign_scheduled', 'PRIMARY'] },
            { name: 'message_queue', expected: ['idx_msg_queue_token', 'idx_msg_queue_device', 'idx_msg_queue_user', 'idx_msg_queue_priority', 'idx_msg_queue_status', 'idx_msg_queue_scheduled', 'PRIMARY'] },
            { name: 'user_subscriptions', expected: ['idx_sub_user', 'idx_sub_package', 'idx_sub_token', 'idx_sub_status', 'idx_sub_started_at', 'idx_sub_expired_at', 'idx_sub_auto_renew', 'PRIMARY'] },
            { name: 'webhooks', expected: ['idx_webhook_token', 'idx_webhook_device', 'idx_webhook_user', 'idx_webhook_active', 'PRIMARY'] },
            { name: 'user_reset_password', expected: ['idx_urp_token', 'idx_urp_user', 'idx_urp_email', 'idx_urp_used', 'idx_urp_expired_at', 'PRIMARY'] }
        ]

        for (const table of tables) {
            console.log(`\nChecking table: ${table.name}`)

            // Get all indexes for the table
            const [indexes] = await sequelize.query(`SHOW INDEX FROM \`${table.name}\``)

            // Group by Key_name
            const keyNames = [...new Set(indexes.map(idx => idx.Key_name))]

            for (const keyName of keyNames) {
                // If it's not in our "expected" list, it's likely a redundant anonymous index created by Sequelize attributes
                if (!table.expected.includes(keyName)) {
                    console.log(`  > Found redundant index: ${keyName}. Dropping...`)
                    try {
                        await sequelize.query(`ALTER TABLE \`${table.name}\` DROP INDEX \`${keyName}\``)
                        console.log(`    [SUCCESS] Dropped ${keyName}`)
                    } catch (dropErr) {
                        console.error(`    [FAILED] Could not drop ${keyName}: ${dropErr.message}`)
                    }
                }
            }
        }

        console.log('\n--- Database Cleanup Completed ---')
        process.exit(0)
    } catch (err) {
        console.error('Cleanup failed:', err)
        process.exit(1)
    }
}

cleanup()
