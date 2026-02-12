'use strict'

const Logger = require('@core/logger.core')

/**
 * Watchdog Service
 * Monitors WhatsApp client states and triggers recovery for stuck clients
 */
class WatchdogService {
    constructor(whatsappInit) {
        this.whatsappInit = whatsappInit
        this.interval = null
        this.CHECK_INTERVAL = 60000 // Check every minute
        this.STUCK_THRESHOLD = 120000 // 2 minutes threshold
        this.clientLastActivity = new Map()
    }

    /**
     * Start the watchdog timer
     */
    start() {
        if (this.interval) return

        Logger.info('Watchdog service starting...')
        this.interval = setInterval(() => this.check(), this.CHECK_INTERVAL)
    }

    /**
     * Stop the watchdog timer
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
            Logger.info('Watchdog service stopped')
        }
    }

    /**
     * Perform health check on all clients
     */
    async check() {
        const now = Date.now()
        const clients = this.whatsappInit.getAllClients()

        for (const clientInfo of clients) {
            const { clientId, state } = clientInfo

            // Only monitor transitional/stuck-prone states
            if (['OPENING', 'initializing', 'INITIALIZING', 'AUTHENTICATING'].includes(state)) {
                if (!this.clientLastActivity.has(clientId)) {
                    this.clientLastActivity.set(clientId, now)
                    continue
                }

                const lastActivity = this.clientLastActivity.get(clientId)
                const stuckDuration = now - lastActivity

                if (stuckDuration > this.STUCK_THRESHOLD) {
                    Logger.warn(`Watchdog: Client ${clientId} is stuck in ${state} for ${Math.round(stuckDuration / 1000)}s. Triggering recovery...`)

                    this.clientLastActivity.delete(clientId) // Reset for this client

                    this.whatsappInit.reconnect(clientId).catch(err => {
                        Logger.error(`Watchdog: Recovery failed for ${clientId}`, err)
                    })
                }
            } else {
                // Client is in a stable state, reset activity tracking
                this.clientLastActivity.delete(clientId)
            }
        }
    }
}

module.exports = WatchdogService
