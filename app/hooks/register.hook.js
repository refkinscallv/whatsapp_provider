'use strict'

const Logger = require('@core/logger.core')

module.exports = {
    register(Hooks) {
        Logger.info('hooks', 'registering application hooks...')

        // Before hooks
        Hooks.register('before', async () => {
            Logger.info('hooks', 'executing before hooks...')
            // Add your before initialization logic here
        })

        // After hooks - Load from separate file
        Hooks.register('after', async () => {
            Logger.info('hooks', 'executing after hooks...')
            const afterHook = require('./after.hook')
            await afterHook()
        })

        // Shutdown hooks - Load from separate file
        Hooks.register('shutdown', async () => {
            Logger.info('hooks', 'executing shutdown hooks...')
            const shutdownHook = require('./shutdown.hook')
            await shutdownHook()
        })

        Logger.info('hooks', 'application hooks registered')
    },
}
