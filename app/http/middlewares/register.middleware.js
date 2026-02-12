'use strict'

const Logger = require('@core/logger.core')

module.exports = {
    register(app) {
        Logger.info('middlewares', 'registering custom middlewares...')

        // Add your custom middlewares here
        // Example: app.use(yourMiddleware)

        Logger.info('middlewares', 'custom middlewares registered')
    },
}
