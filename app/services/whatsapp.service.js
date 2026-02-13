'use strict'

const whatsappInit = require('./whatsappInit.service')
const WhatsAppEvents = require('./whatsappEvents.service')
const WhatsAppActions = require('./whatsappActions.service')

/**
 * Main WhatsApp Service
 * Integrates Init, Events, and Actions services
 */
class WhatsAppService {
    constructor() {
        this.init = whatsappInit
        this.events = null
        this.actions = null
        this.initialized = false
    }

    /**
     * Initialize WhatsApp service with Socket.IO
     * @param {SocketIO} io - Socket.IO instance
     */
    initialize(io) {
        if (this.initialized) {
            return
        }

        // Initialize events and actions instances first
        this.events = new WhatsAppEvents(this.init, io)
        this.actions = new WhatsAppActions(this.init)

        // Initialize core service with events instance
        this.init.init(io, this.events)

        this.initialized = true
    }

    /**
     * Create and initialize a WhatsApp client
     * @param {string} clientId - Device token
     * @param {object} options - Additional options
     * @returns {Promise<Client>}
     */
    async createClient(clientId, options = {}) {
        const client = await this.init.createClient(clientId, options)

        // Register event listeners
        this.events.register(clientId, client)

        return client
    }

    /**
     * Destroy a WhatsApp client
     * @param {string} clientId - Device token
     * @param {boolean} deleteSession - Whether to delete session
     * @returns {Promise<boolean>}
     */
    async destroyClient(clientId, deleteSession = false) {
        const client = this.init.getClient(clientId)

        if (client) {
            // Remove event listeners
            this.events.removeAllListeners(client)
        }

        return await this.init.destroyClient(clientId, deleteSession)
    }

    /**
     * Get client instance
     * @param {string} clientId - Device token
     * @returns {Client|undefined}
     */
    getClient(clientId) {
        return this.init.getClient(clientId)
    }

    /**
     * Check if client is ready
     * @param {string} clientId - Device token
     * @returns {boolean}
     */
    isClientReady(clientId) {
        return this.init.isClientReady(clientId)
    }

    /**
     * Get all clients
     * @returns {Array}
     */
    getAllClients() {
        return this.init.getAllClients()
    }

    /**
     * Get client info
     * @param {string} clientId - Device token
     * @returns {object|null}
     */
    getClientInfo(clientId) {
        return this.init.getClientInfo(clientId)
    }

    /**
     * Send message
     * @param {string} clientId - Device token
     * @param {string} to - Recipient
     * @param {string} message - Message text
     * @param {object} options - Additional options
     * @returns {Promise<object>}
     */
    async sendMessage(clientId, to, message, options = {}) {
        return await this.actions.sendMessage(clientId, to, message, options)
    }

    /**
     * Send media message
     * @param {string} clientId - Device token
     * @param {string} to - Recipient
     * @param {object} media - Media object
     * @param {string} caption - Caption
     * @returns {Promise<object>}
     */
    async sendMediaMessage(clientId, to, media, caption = '') {
        return await this.actions.sendMediaMessage(clientId, to, media, caption)
    }

    /**
     * Send bulk messages
     * @param {string} clientId - Device token
     * @param {Array} recipients - Recipients array
     * @param {number} delay - Delay between messages
     * @returns {Promise<object>}
     */
    async sendBulkMessages(clientId, recipients, delay = 1000) {
        return await this.actions.sendBulkMessages(clientId, recipients, delay)
    }

    /**
     * Get chats
     * @param {string} clientId - Device token
     * @returns {Promise<Array>}
     */
    async getChats(clientId) {
        return await this.actions.getChats(clientId)
    }

    /**
     * Get contacts
     * @param {string} clientId - Device token
     * @returns {Promise<Array>}
     */
    async getContacts(clientId) {
        return await this.actions.getContacts(clientId)
    }

    /**
     * Sync contacts
     * @param {string} clientId - Device token
     * @returns {Promise<object>}
     */
    async syncContacts(clientId) {
        return await this.actions.syncContacts(clientId)
    }

    /**
     * Check if number is registered
     * @param {string} clientId - Device token
     * @param {string} number - Phone number
     * @returns {Promise<boolean>}
     */
    async isRegisteredUser(clientId, number) {
        return await this.actions.isRegisteredUser(clientId, number)
    }

    /**
     * Logout client
     * @param {string} clientId - Device token
     * @returns {Promise<void>}
     */
    async logout(clientId) {
        return await this.actions.logout(clientId)
    }

    /**
     * Get metrics
     * @returns {object}
     */
    getMetrics() {
        return this.init.getMetrics()
    }
}

// Export singleton instance
const whatsappService = new WhatsAppService()
module.exports = whatsappService
