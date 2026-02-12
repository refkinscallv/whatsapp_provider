'use strict'
require('module-alias/register')
const db = require('./core/database.core')

async function testSync() {
    try {
        console.log('Testing Synchronization with DB_ALTER=true...')
        // Force alter to true for this test
        const config = require('./app/config')
        config.database.sync = true
        config.database.alter = true

        await db.init()
        console.log('--- Sync Test Successful! ---')
        process.exit(0)
    } catch (err) {
        console.error('--- Sync Test Failed ---')
        console.error(err)
        process.exit(1)
    }
}

testSync()
