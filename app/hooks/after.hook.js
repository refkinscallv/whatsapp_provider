'use strict'

const whatsappService = require('@app/services/whatsapp.service')
const cronJobs = require('@app/jobs/cron.jobs')
const Socket = require('@core/socket.core')
const Logger = require('@core/logger.core')

/**
 * After Hook
 * Runs after the server has started
 */
module.exports = async () => {
    Logger.info('Running after hook - Initializing WhatsApp service and cron jobs...')

    try {
        // Initialize WhatsApp service with Socket.IO
        const io = Socket.io
        if (io) {
            whatsappService.initialize(io)
            Logger.info('WhatsApp service initialized with Socket.IO')
        } else {
            Logger.warn('Socket.IO not available, WhatsApp service initialized without it')
            whatsappService.initialize(null)
        }

        // Initialize cron jobs
        cronJobs.init()
        Logger.info('Cron jobs initialized')

        // Reconnect active devices
        const deviceService = require('@app/services/device.service')
        deviceService.reconnectActiveDevices()

        // Deduplicate contacts on startup
        const contactService = require('@app/services/contact.service')
        await contactService.deduplicateAll()
    } catch (err) {
        Logger.error('Failed to initialize WhatsApp service or cron jobs', err)
    }
}
