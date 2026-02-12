'use strict'

const whatsappService = require('@app/services/whatsapp.service')
const cronJobs = require('@app/jobs/cron.jobs')
const Logger = require('@core/logger.core')

/**
 * Shutdown Hook
 * Runs before the application shuts down
 */
module.exports = async () => {
    Logger.info('Running shutdown hook - Cleaning up WhatsApp clients and cron jobs...')

    try {
        // Stop all cron jobs
        cronJobs.stopAll()
        Logger.info('All cron jobs stopped')

        // Destroy all WhatsApp clients
        await whatsappService.init.destroyAllClients(false)
        Logger.info('All WhatsApp clients destroyed safely')
    } catch (err) {
        Logger.error('Error during shutdown cleanup', err)
    }
}
