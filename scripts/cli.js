'use strict'

require('module-alias/register')
const db = require('@core/database.core')
const fs = require('fs')
const path = require('path')
const seed = require('./database_seeder')

const command = process.argv[2]

/**
 * Setup command: Initialize DB (sync) and Seed data
 */
async function setup() {
    console.log('\n🚀 Starting System Setup...')
    try {
        await db.init()
        console.log('✅ Database connection and synchronization complete.')

        console.log('📦 Seeding initial data...')
        await seed()

        console.log('\n✨ Setup completed successfully!')
        process.exit(0)
    } catch (err) {
        console.error('\n❌ Setup failed:', err.message)
        process.exit(1)
    }
}

/**
 * Reset command: Wipe sessions, logs, and database
 */
async function reset() {
    console.log('\n⚠️  WARNING: This will wipe ALL data, sessions, and logs!')
    console.log('Starting System Reset...\n')

    try {
        // 1. Clear sessions
        const sessionDir = path.join(__dirname, '../whatsapp_sessions')
        if (fs.existsSync(sessionDir)) {
            console.log('🗑️  Clearing WhatsApp sessions...')
            const items = fs.readdirSync(sessionDir)
            for (const item of items) {
                if (item === '.gitkeep') continue
                const fullPath = path.join(sessionDir, item)
                fs.rmSync(fullPath, { recursive: true, force: true })
            }
        }

        // 2. Clear browser sessions
        const browserSessionDir = path.join(__dirname, '../browser-sessions')
        if (fs.existsSync(browserSessionDir)) {
            console.log('🗑️  Clearing Browser sessions...')
            const items = fs.readdirSync(browserSessionDir)
            for (const item of items) {
                if (item === '.gitkeep') continue
                const fullPath = path.join(browserSessionDir, item)
                fs.rmSync(fullPath, { recursive: true, force: true })
            }
        }

        // 3. Clear logs
        const logDir = path.join(__dirname, '../logs')
        if (fs.existsSync(logDir)) {
            console.log('🗑️  Clearing logs...')
            const items = fs.readdirSync(logDir)
            for (const item of items) {
                if (item === '.gitkeep') continue
                const fullPath = path.join(logDir, item)
                fs.rmSync(fullPath, { recursive: true, force: true })
            }
        }

        // 4. Reset Database
        // Bypass automatic sync in db.init() by temporarily changing config
        const config = require('@app/config')
        const originalSync = config.database.sync
        config.database.sync = false

        await db.init()
        const sequelize = db.getInstance()

        console.log('💣 Dropping and recreating all tables...')
        // Disable foreign key checks for the reset process
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0')
        await sequelize.sync({ force: true })
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1')

        // Restore config
        config.database.sync = originalSync

        // 4. Seed
        console.log('📦 Seeding initial data...')
        await seed()

        console.log('\n✅ System reset to default successfully!')
        process.exit(0)
    } catch (err) {
        console.error('\n❌ Reset failed:', err.message)
        process.exit(1)
    }
}

function showHelp() {
    console.log(`
📦 WARF CLI - Management Tool

Usage: node scripts/cli.js <command>

Commands:
  setup    Initialize database and seed initial data (Packages, Super Admin)
  reset    Wipe all sessions, logs, and reset database to factory defaults
  seed     Run the database seeder only
  help     Show this help message
    `)
}

switch (command) {
    case 'setup':
        setup()
        break
    case 'reset':
        reset()
        break
    case 'seed':
        seed().then(() => process.exit(0)).catch(() => process.exit(1))
        break
    case 'help':
    default:
        showHelp()
        break
}
