'use strict'

const config = require('@app/config')
const Logger = require('@core/logger.core')

module.exports = class Runtime {
    static init() {
        try {
            Logger.info('runtime', 'configuring runtime environment...')

            // Set timezone
            process.env.TZ = config.app.timezone

            // Set NODE_ENV
            process.env.NODE_ENV = config.app.production ? 'production' : 'development'

            Logger.info('runtime', `timezone set to: ${config.app.timezone}`)
            Logger.info('runtime', `environment: ${process.env.NODE_ENV}`)
        } catch (err) {
            Logger.set(err, 'runtime')
        }
    }
}
