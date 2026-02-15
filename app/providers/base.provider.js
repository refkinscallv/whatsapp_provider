'use strict'

const EventEmitter = require('events')

/**
 * WhatsApp Base Provider
 * Abstract class defining the interface for WhatsApp engines
 */
class BaseProvider extends EventEmitter {
    constructor(clientId, options = {}) {
        super()
        this.clientId = clientId
        this.options = options
        this.client = null
        this.state = 'disconnected'
    }

    /**
     * Initialize the provider
     */
    async initialize() {
        throw new Error('Method initialize() must be implemented')
    }

    /**
     * Destroy the provider
     */
    async destroy() {
        throw new Error('Method destroy() must be implemented')
    }

    /**
     * Send message
     */
    async sendMessage(to, content, options = {}) {
        throw new Error('Method sendMessage() must be implemented')
    }

    /**
     * Send media
     */
    async sendMedia(to, media, options = {}) {
        throw new Error('Method sendMedia() must be implemented')
    }

    /**
     * Send presence (typing, recording, etc)
     * @param {string} to - Recipient ID
     * @param {string} presence - Presence type (composing, recording, paused)
     */
    async sendPresence(to, presence) {
        throw new Error('Method sendPresence() must be implemented')
    }

    /**
     * Get chats
     */
    async getChats() {
        throw new Error('Method getChats() must be implemented')
    }

    /**
     * Get contacts
     */
    async getContacts() {
        throw new Error('Method getContacts() must be implemented')
    }

    /**
     * Get contact info
     */
    async getContactById(id) {
        throw new Error('Method getContactById() must be implemented')
    }

    /**
     * Check if number is registered
     */
    async isRegisteredUser(id) {
        throw new Error('Method isRegisteredUser() must be implemented')
    }

    /**
     * Get client state
     */
    async getState() {
        throw new Error('Method getState() must be implemented')
    }

    /**
     * Logout
     */
    async logout() {
        throw new Error('Method logout() must be implemented')
    }

    /**
     * Update internal state and emit event
     */
    updateState(state) {
        this.state = state
        this.emit('change_state', state)
        this.emit('state_change', state) // Keep for backward compatibility if any
    }
}

module.exports = BaseProvider
