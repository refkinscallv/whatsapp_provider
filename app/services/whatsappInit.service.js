'use strict'

const ProviderFactory = require('../providers/provider.factory')
const Logger = require('@core/logger.core')
const EventEmitter = require('events')
const path = require('path')
const fs = require('fs')
const WatchdogService = require('./watchdog.service')

/**
 * Modern User Agent Pool (10+ high-reputation UAs)
 * Rotates between Windows, Mac, and Linux to avoid fingerprinting clusters
 */
const USER_AGENTS = [
    // Windows Chrome
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    // Mac Chrome
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    // Linux Chrome
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    // Windows Edge
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
    // Mac Safari-like
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
]

/**
 * Get a random modern user agent
 * @returns {string}
 */
function getModernUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

/**
 * Get randomized viewport size
 * @returns {object}
 */
function getRandomViewport() {
    const viewports = [
        { width: 1366, height: 768 },
        { width: 1920, height: 1080 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 },
        { width: 1600, height: 900 },
        { width: 1680, height: 1050 },
    ]
    return viewports[Math.floor(Math.random() * viewports.length)]
}

/**
 * Get timezone (from env or server default)
 * @returns {string}
 */
function getTimezone() {
    return process.env.TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'
}

/**
 * WhatsApp Initialization Service
 * Manages WhatsApp client instances lifecycle
 */
class WhatsAppInit extends EventEmitter {
    constructor() {
        super()

        // Core properties
        this.initialized = false
        this.io = null
        this.eventsInstance = null // Store WhatsAppEvents instance

        // Client management
        this.clients = new Map()
        this.clientStates = new Map()
        this.providerTypes = new Map() // Track provider type for each client
        this.reconnectAttempts = new Map()
        this.clientTimers = new Map()
        this.activeReconnections = new Map() // Track active reconnection promises
        this.watchdog = new WatchdogService(this) // Initialize Watchdog

        // Configuration
        this.sessionsDir = process.env.WHATSAPP_SESSIONS_DIR || './whatsapp_sessions'
        this.REINIT_DELAY = parseInt(process.env.WHATSAPP_REINIT_DELAY) || 5000
        this.MAX_RECONNECT_ATTEMPTS = parseInt(process.env.WHATSAPP_MAX_RECONNECT_ATTEMPTS) || 5
        this.chromePath = process.env.WHATSAPP_CHROME_PATH || undefined
        this.qrMaxRetries = parseInt(process.env.WHATSAPP_QR_MAX_RETRIES) || 5

        // Metrics tracking
        this.metrics = {
            messagesReceived: 0,
            messagesSent: 0,
            errors: 0,
            reconnections: 0,
            clientsCreated: 0,
            clientsDestroyed: 0,
        }
    }

    /**
     * Initialize WhatsApp service
     * @param {SocketIO} io - Socket.IO instance
     * @param {WhatsAppEvents} eventsInstance - WhatsAppEvents instance
     */
    init(io, eventsInstance = null) {
        if (this.initialized) {
            Logger.warn('WhatsApp service already initialized')
            return
        }

        try {
            this.io = io
            this.eventsInstance = eventsInstance // Store the events instance
            this.ensureSessionsDirectory()
            this.setupProcessHandlers()
            this.initialized = true

            // Start background watchdog
            this.watchdog.start()

            Logger.info('WhatsApp Initialization Service ready (Multi-Provider)', {
                sessionsDir: this.sessionsDir,
                maxReconnectAttempts: this.MAX_RECONNECT_ATTEMPTS,
            })
        } catch (err) {
            Logger.error('Failed to initialize WhatsApp service', err)
            throw err
        }
    }

    /**
     * Ensure sessions directory exists
     */
    ensureSessionsDirectory() {
        if (!fs.existsSync(this.sessionsDir)) {
            fs.mkdirSync(this.sessionsDir, { recursive: true })
            Logger.info(`Created sessions directory: ${this.sessionsDir}`)
        }
    }

    /**
     * Setup process event handlers for cleanup
     */
    setupProcessHandlers() {
        const cleanup = async () => {
            Logger.info('Cleaning up WhatsApp clients...')
            await this.destroyAllClients(false)
        }

        process.once('SIGTERM', cleanup)
        process.once('SIGINT', cleanup)
    }

    /**
     * Get client instance by ID
     * @param {string} clientId - Client identifier
     * @returns {Client|undefined}
     */
    getClient(clientId) {
        if (!clientId) {
            throw new Error('clientId is required')
        }
        return this.clients.get(clientId)
    }

    /**
     * Check if client exists
     * @param {string} clientId - Client identifier
     * @returns {boolean}
     */
    hasClient(clientId) {
        return this.clients.has(clientId) && this.clients.get(clientId) !== null
    }

    /**
     * Get provider type for a client
     * @param {string} clientId - Client identifier
     * @returns {string} Provider type ('wwebjs' or 'baileys')
     */
    getProviderType(clientId) {
        return this.providerTypes.get(clientId) || 'wwebjs'
    }

    /**
     * Get all clients information
     * @returns {Array<object>}
     */
    getAllClients() {
        return Array.from(this.clients.entries()).map(([id, client]) => ({
            clientId: id,
            provider: this.providerTypes.get(id) || 'unknown',
            state: this.clientStates.get(id) || 'unknown',
            info: client?.info || null,
            reconnectAttempts: this.reconnectAttempts.get(id) || 0,
        }))
    }

    /**
     * Get specific client information
     * @param {string} clientId - Client identifier
     * @returns {object|null}
     */
    getClientInfo(clientId) {
        const client = this.getClient(clientId)
        if (!client) return null

        try {
            return {
                clientId,
                provider: this.providerTypes.get(clientId) || 'unknown',
                state: this.clientStates.get(clientId) || 'unknown',
                info: client.info || null,
                reconnectAttempts: this.reconnectAttempts.get(clientId) || 0,
                isReady: this.isClientReady(clientId),
            }
        } catch (err) {
            Logger.error(`Failed to get client info for ${clientId}`, err)
            return null
        }
    }

    /**
     * Check if client is ready to use
     * @param {string} clientId - Client identifier
     * @returns {boolean}
     */
    isClientReady(clientId) {
        const state = this.clientStates.get(clientId)
        return state === 'ready' || state === 'authenticated'
    }

    /**
     * Create and initialize WhatsApp client
     * @param {string} clientId - Client identifier
     * @param {object} options - Additional client options
     * @returns {Promise<Client>}
     */
    async createClient(clientId, options = {}) {
        if (!clientId) {
            throw new Error('clientId is required')
        }

        // Check existing client
        if (this.hasClient(clientId)) {
            Logger.warn(`Client ${clientId} already exists`)
            const existingClient = this.getClient(clientId)

            if (this.isClientReady(clientId)) {
                Logger.info(`Returning existing ready client ${clientId}`)
                return existingClient
            }

            Logger.info(`Destroying existing non-ready client ${clientId}`)
            await this.destroyClient(clientId, false)
        }

        const providerType = options.provider || process.env.WHATSAPP_DEFAULT_PROVIDER || 'wwebjs'

        try {
            // Get randomized fingerprint
            const userAgent = getModernUserAgent()
            const viewport = getRandomViewport()
            const timezone = getTimezone()

            Logger.debug(`Creating ${providerType} client ${clientId} with UA: ${userAgent.substring(0, 50)}...`)

            const providerOptions = {
                sessionsDir: this.sessionsDir,
                chromePath: this.chromePath,
                userAgent: userAgent,
                viewport: viewport,
                timezone: timezone,
                qrMaxRetries: this.qrMaxRetries,
                ...options
            }

            const client = ProviderFactory.create(providerType, clientId, providerOptions)

            this.clients.set(clientId, client)
            this.clientStates.set(clientId, 'initializing')
            this.providerTypes.set(clientId, providerType)

            // Register events via WhatsAppEvents service (if available)
            if (this.eventsInstance) {
                this.eventsInstance.register(clientId, client)
            }

            Logger.info(`Initializing ${providerType} client ${clientId}...`)

            await client.initialize()
            this.metrics.clientsCreated++

            return client
        } catch (err) {
            Logger.error(`Failed to create ${providerType} client ${clientId}`, err)

            // Force cleanup on failure to release locks
            await this.destroyClient(clientId, false).catch(() => { })

            this.clients.delete(clientId)
            this.clientStates.delete(clientId)
            this.providerTypes.delete(clientId)
            this.metrics.errors++

            const attempts = this.reconnectAttempts.get(clientId) || 0

            if (attempts < this.MAX_RECONNECT_ATTEMPTS) {
                this.reconnectAttempts.set(clientId, attempts + 1)
                this.metrics.reconnections++

                Logger.warn(`Retrying client ${clientId} (${attempts + 1}/${this.MAX_RECONNECT_ATTEMPTS}) in ${this.REINIT_DELAY / 1000}s`)

                const timer = setTimeout(() => {
                    this.clientTimers.delete(clientId)
                    this.createClient(clientId, options).catch((e) => {
                        Logger.error(`Retry failed for ${clientId}`, e)
                    })
                }, this.REINIT_DELAY)

                this.clientTimers.set(clientId, timer)
            } else {
                Logger.error(`Max reconnect attempts reached for ${clientId}`)
                this.reconnectAttempts.delete(clientId)
                this.emit('client_failed', { clientId, error: err })
            }

            throw err
        }
    }

    /**
     * Destroy WhatsApp client
     * @param {string} clientId - Client identifier
     * @param {boolean} deleteSession - Whether to delete session files
     * @returns {Promise<boolean>}
     */
    async destroyClient(clientId, deleteSession = false) {
        if (!clientId) {
            throw new Error('clientId is required')
        }

        try {
            const client = this.getClient(clientId)

            if (client) {
                Logger.info(`Destroying client ${clientId}...`, { deleteSession })

                // Remove all events from this client instance to avoid double-firing if re-created
                if (this.eventsInstance) {
                    this.eventsInstance.removeAllListeners(client)
                }

                // Destroy client with timeout
                try {
                    await Promise.race([client.destroy(), new Promise((_, reject) => setTimeout(() => reject(new Error('Destroy timeout')), 10000))])
                } catch (err) {
                    Logger.warn(`Error during client destroy for ${clientId}`, err)
                }

                // Cleanup maps
                this.clients.delete(clientId)
                this.clientStates.delete(clientId)
                this.reconnectAttempts.delete(clientId)

                // Clear any pending timers
                if (this.clientTimers.has(clientId)) {
                    clearTimeout(this.clientTimers.get(clientId))
                    this.clientTimers.delete(clientId)
                }

                // Update metrics
                this.metrics.clientsDestroyed++

                Logger.info(`Client ${clientId} destroyed`)
                this.emit('client_destroyed', { clientId })

                // Emit to Socket.IO
                if (this.io) {
                    this.io.to(`client:${clientId}`).emit('whatsapp:client_destroyed', { clientId })
                    this.io.emit('whatsapp:client_destroyed:broadcast', { clientId })
                }
            }

            // Delete session if requested
            if (deleteSession) {
                await this.deleteSession(clientId)
            }

            return true
        } catch (err) {
            Logger.error(`Failed to destroy client ${clientId}`, err)

            // Force cleanup
            this.clients.delete(clientId)
            this.clientStates.delete(clientId)

            return false
        }
    }

    /**
     * Delete client session files
     * @param {string} clientId - Client identifier
     * @returns {Promise<boolean>}
     */
    async deleteSession(clientId) {
        const providerType = this.getProviderType(clientId)
        const prefix = providerType === 'baileys' ? 'baileys-session-' : 'session-'
        const sessionPath = path.join(this.sessionsDir, `${prefix}${clientId}`)

        if (!fs.existsSync(sessionPath)) {
            // Also try the other prefix just in case provider info is lost or mismatched
            const altPrefix = providerType === 'baileys' ? 'session-' : 'baileys-session-'
            const altPath = path.join(this.sessionsDir, `${altPrefix}${clientId}`)
            if (fs.existsSync(altPath)) {
                return await this._doDeleteSession(altPath, clientId)
            }

            Logger.info(`Session folder does not exist: ${sessionPath}`)
            return true
        }

        return await this._doDeleteSession(sessionPath, clientId)
    }

    /**
     * Internal helper for physical session deletion
     * @private
     */
    async _doDeleteSession(sessionPath, clientId) {
        // Retry logic for session deletion
        for (let attempt = 1; attempt <= 5; attempt++) {
            try {
                await fs.promises.rm(sessionPath, { recursive: true, force: true })
                Logger.info(`Session folder deleted: ${sessionPath}`)
                return true
            } catch (err) {
                if (err.code === 'ENOENT') {
                    Logger.info(`Session folder already deleted: ${sessionPath}`)
                    return true
                }

                Logger.warn(`Failed to delete session (attempt ${attempt}/5) for ${clientId}`, err)

                if (attempt < 5) {
                    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
                }
            }
        }

        Logger.error(`Failed to delete session after 5 attempts: ${sessionPath}`)
        return false
    }

    /**
     * Destroy all clients
     * @param {boolean} deleteSessions - Whether to delete all sessions
     * @returns {Promise<void>}
     */
    async destroyAllClients(deleteSessions = false) {
        const clientIds = Array.from(this.clients.keys())

        if (clientIds.length === 0) {
            Logger.info('No clients to destroy')
            return
        }

        Logger.info(`Destroying ${clientIds.length} client(s)...`, { deleteSessions })

        // Clear all timers
        for (const timer of this.clientTimers.values()) {
            clearTimeout(timer)
        }
        this.clientTimers.clear()

        // Destroy all clients
        await Promise.allSettled(clientIds.map((clientId) => this.destroyClient(clientId, deleteSessions)))

        Logger.info('All clients destroyed')
    }

    /**
     * Get service metrics
     * @returns {object}
     */
    getMetrics() {
        return {
            ...this.metrics,
            activeClients: this.clients.size,
            readyClients: Array.from(this.clientStates.values()).filter((s) => s === 'ready').length,
        }
    }

    /**
     * Update client state
     * @param {string} clientId
     * @param {string} state
     */
    updateState(clientId, state) {
        this.clientStates.set(clientId, state)
        this.emit('state_changed', { clientId, state })
    }

    /**
     * Safely reconnect a client
     * Destroys existing instance and creates a new one
     * @param {string} clientId 
     * @returns {Promise<Client>}
     */
    async reconnect(clientId) {
        if (!clientId) throw new Error('clientId is required')

        // Prevent concurrent reconnection attempts
        if (this.activeReconnections.has(clientId)) {
            Logger.info(`Reconnection already in progress for ${clientId}`)
            return this.activeReconnections.get(clientId)
        }

        const reconnectPromise = (async () => {
            try {
                Logger.info(`Triggering manual reconnect for ${clientId}...`)

                // 1. Destroy existing client (don't delete session)
                await this.destroyClient(clientId, false)

                // 2. Add small delay to allow puppeteer to fully close
                await new Promise(resolve => setTimeout(resolve, 2000))

                // 3. Create new client instance
                return await this.createClient(clientId)
            } finally {
                this.activeReconnections.delete(clientId)
            }
        })()

        this.activeReconnections.set(clientId, reconnectPromise)
        return reconnectPromise
    }
}

// Export singleton instance
const whatsappInit = new WhatsAppInit()
module.exports = whatsappInit
