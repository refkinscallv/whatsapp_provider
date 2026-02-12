'use strict'

/**
 * Database Cleanup Script
 * Use this to remove orphan records that cause foreign key constraint failures.
 * This script disables DB_ALTER temporarily during its run.
 */

require('module-alias/register')
const config = require('./app/config')

// Bypass synchronization for the cleanup run
config.database.sync = false
config.database.alter = false

const db = require('./core/database.core')

async function cleanup() {
    try {
        console.log('--- Database Cleanup Started ---')
        await db.init()

        const { Device } = db.models
        const Op = db.Op

        // 1. Get all valid device tokens (including soft-deleted ones as paranoia is true)
        // Note: FKs usually reference the actual PK, and if Device is paranoid, the row still exists.
        // However, if the row was HARD deleted, it's gone.
        const allDevices = await Device.findAll({
            attributes: ['token'],
            paranoid: false // Get even soft-deleted ones just in case
        })
        const validTokens = allDevices.map(d => d.token)

        console.log(`Found ${validTokens.length} existing devices in database.`)

        const orphanTables = [
            { model: 'UserDevice', field: 'device_token' },
            { model: 'MessageHistory', field: 'device_token' },
            { model: 'Contact', field: 'device_token' },
            { model: 'AutoReplyRule', field: 'device_token' },
            { model: 'MessageTemplate', field: 'device_token' },
            { model: 'Webhook', field: 'device_token' }
        ]

        for (const pipe of orphanTables) {
            const Model = db.models[pipe.model]
            if (!Model) {
                console.warn(`[!] Model ${pipe.model} not found, skipping...`)
                continue
            }

            console.log(`Checking ${pipe.model} for orphans on ${pipe.field}...`)

            const deleted = await Model.destroy({
                where: {
                    [pipe.field]: {
                        [Op.notIn]: validTokens
                    }
                }
            })

            if (deleted > 0) {
                console.log(`[✔] Deleted ${deleted} orphan records from ${pipe.model}`)
            } else {
                console.log(`[·] No orphans found in ${pipe.model}`)
            }
        }

        console.log('--- Cleanup Finished ---')
        process.exit(0)
    } catch (err) {
        console.error('--- Cleanup Failed ---')
        console.error(err)
        process.exit(1)
    }
}

cleanup()
