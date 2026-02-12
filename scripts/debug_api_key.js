'use strict'

require('module-alias/register')
const db = require('@core/database.core')
const apiKeyService = require('@app/services/apiKey.service')

async function test() {
    try {
        await db.init()
        console.log('Database initialized')

        const user = await db.models.User.findOne()
        if (!user) {
            console.error('No user found in database')
            process.exit(1)
        }

        console.log(`Testing for user: ${user.token}`)

        const result = await apiKeyService.createKey(user.token, { name: 'Test Key' })
        console.log('Success:', result)
    } catch (err) {
        console.error('FAILED:', err)
    } finally {
        await db.close()
    }
}

test()
