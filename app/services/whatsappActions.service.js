'use strict'

const Logger = require('@core/logger.core')
const db = require('@core/database.core')
const Hash = require('@core/helpers/hash.helper')
const templateService = require('./template.service')

/**
 * WhatsApp Actions Service
 * Handles all WhatsApp actions (send message, get chats, etc.)
 */
class WhatsAppActions {
    constructor(whatsappInit) {
        this.whatsappInit = whatsappInit
    }

    /**
     * Send a single message
     * @param {string} clientId - Device token
     * @param {string} to - Recipient phone number
     * @param {string} message - Message text
     * @param {object} options - Additional options
     * @returns {Promise<object>}
     */
    async sendMessage(clientId, to, message, options = {}) {
        const client = this.whatsappInit.getClient(clientId)

        if (!client) {
            throw new Error(`Client ${clientId} not found`)
        }

        if (!this.whatsappInit.isClientReady(clientId)) {
            throw new Error(`Client ${clientId} is not ready`)
        }

        try {
            const chatId = to.includes('@') ? to : `${to}@c.us`

            // Parse placeholders
            const contact = await this.getRecipientContact(client, chatId)
            let finalMessage = templateService.parseTemplate(message, contact)

            // Invisible Jitter: Automatically append a random zero-width space (\u200B)
            // to the end of message templates when used in campaigns to ensure unique hash
            if (options.metadata && options.metadata.campaign_token) {
                finalMessage += '\u200B'.repeat(Math.floor(Math.random() * 5) + 1)
            }

            // Send with retry
            const response = await this.safeSendMessage(clientId, client, chatId, finalMessage, options)

            // Save to message history
            await this.saveMessageHistory(clientId, {
                user_token: options.user_token || null,
                message_id: response.id._serialized,
                to: chatId,
                message: finalMessage,
                type: 'text',
                status: 'sent',
                sent_at: new Date(),
                metadata: options.metadata || null,
            })

            Logger.info(`Message sent from ${clientId} to ${to}`, {
                messageId: response.id._serialized,
                length: finalMessage.length,
            })

            return {
                success: true,
                messageId: response.id._serialized,
                timestamp: response.timestamp,
            }
        } catch (err) {
            Logger.error(`Failed to send message from ${clientId} to ${to}`, err)

            // Save failed message to history
            await this.saveMessageHistory(clientId, {
                user_token: options.user_token || null,
                to: to.includes('@') ? to : `${to}@c.us`,
                message,
                type: 'text',
                status: 'failed',
                error_message: err.message,
            })

            throw err
        }
    }

    /**
     * Send message with media
     * @param {string} clientId - Device token
     * @param {string} to - Recipient phone number
     * @param {object} media - Media object with data and options
     * @param {string} caption - Optional caption
     * @returns {Promise<object>}
     */
    async sendMediaMessage(clientId, to, media, caption = '') {
        const client = this.whatsappInit.getClient(clientId)

        if (!client) {
            throw new Error(`Client ${clientId} not found`)
        }

        if (!this.whatsappInit.isClientReady(clientId)) {
            throw new Error(`Client ${clientId} is not ready`)
        }

        try {
            const { MessageMedia } = require('whatsapp-web.js')
            const chatId = to.includes('@') ? to : `${to}@c.us`

            // Parse placeholders in caption
            const contact = await this.getRecipientContact(client, chatId)
            const finalCaption = templateService.parseTemplate(caption, contact)

            let messageMedia
            if (media.url) {
                messageMedia = await MessageMedia.fromUrl(media.url)
            } else if (media.data) {
                messageMedia = new MessageMedia(media.mimetype, media.data, media.filename)
            } else {
                throw new Error('Media data or URL is required')
            }

            Logger.debug(`Sending media to ${to} with caption: ${finalCaption}`)

            // Send with retry logic to handle "detached Frame" or "getChat of undefined"
            const response = await this.safeSendMessage(clientId, client, chatId, messageMedia, { caption: finalCaption })

            // Determine media type
            const mediaType = this.getMediaType(media.mimetype || messageMedia.mimetype)

            // Save to message history
            await this.saveMessageHistory(clientId, {
                user_token: media.user_token || null,
                message_id: response.id._serialized,
                to: chatId,
                message: finalCaption,
                type: mediaType,
                media_url: media.url || null,
                status: 'sent',
                sent_at: new Date(),
                metadata: media.metadata || null,
            })

            Logger.info(`Media message sent from ${clientId} to ${to}`, {
                messageId: response.id._serialized,
                type: mediaType,
            })

            return {
                success: true,
                messageId: response.id._serialized,
                timestamp: response.timestamp,
                type: mediaType,
            }
        } catch (err) {
            Logger.error(`Failed to send media message from ${clientId} to ${to}`, err)
            throw err
        }
    }

    /**
     * Send message with retry logic and anti-ban simulation
     * @param {string} clientId
     * @param {Client} client 
     * @param {string} chatId 
     * @param {any} content 
     * @param {object} options 
     * @param {number} retries 
     * @returns {Promise<Message>}
     */
    async safeSendMessage(clientId, client, chatId, content, options = {}, retries = 2) {
        for (let i = 0; i <= retries; i++) {
            try {
                // Perform quick health check on the page
                if (client.pupPage && client.pupPage.isClosed()) {
                    throw new Error('Puppeteer page is closed')
                }

                // If not ready but initializing, wait a bit for it to complete
                if (!this.whatsappInit.isClientReady(clientId)) {
                    const info = this.whatsappInit.getClientInfo(clientId)
                    if (info && info.state === 'initializing') {
                        Logger.info(`Client ${clientId} is initializing, waiting for ready...`)
                        // Poll for readiness every 2s for up to 10s
                        for (let p = 0; p < 5; p++) {
                            await new Promise(resolve => setTimeout(resolve, 2000))
                            if (this.whatsappInit.isClientReady(clientId)) {
                                Logger.info(`Client ${clientId} became ready during wait loop.`)
                                break
                            }
                        }
                    }
                }

                // ANTI-BAN: Simulate presence before the first attempt to send
                // Especially important for new contacts/broadcasts
                if (i === 0 && !options.skip_simulation) {
                    const simulationText = typeof content === 'string' ? content : (options.caption || '')
                    await this.simulatePresence(clientId, chatId, simulationText)
                }

                return await client.sendMessage(chatId, content, options)
            } catch (err) {
                const isTransient = err.message.includes('detached Frame') ||
                    err.message.includes('Execution context was destroyed') ||
                    err.message.includes('getChat')

                if (isTransient) {
                    if (i < retries) {
                        const delay = (i + 1) * 2000
                        Logger.warn(`Transient error sending message (attempt ${i + 1}/${retries + 1}). Retrying in ${delay}ms...`, {
                            error: err.message,
                            chatId
                        })
                        await new Promise(resolve => setTimeout(resolve, delay))
                        continue
                    } else {
                        // Persistent browser error after all retries - trigger background recovery
                        Logger.error(`Persistent browser error for ${clientId}. Triggering recovery...`, { error: err.message })
                        this.whatsappInit.reconnect(clientId).catch(recErr => {
                            Logger.error(`Auto-recovery failed for ${clientId}`, recErr)
                        })
                    }
                }
                throw err
            }
        }
    }

    /**
     * Simulate human behavior (Seen, Typing) to reduce ban risk
     * @param {string} clientId 
     * @param {string} chatId
     * @param {string} content - Message content for typing duration calculation
     */
    async simulatePresence(clientId, chatId, content = '') {
        const client = this.whatsappInit.getClient(clientId)
        if (!client) return

        try {
            const chat = await client.getChatById(chatId)

            // 1. Mark as seen
            await chat.sendSeen()

            // 2. Start typing
            await chat.sendStateTyping()

            // 3. Fluid typing delay
            // Calculate typing time based on message length: length * (30ms to 70ms) with a baseline of 1s
            const msgLength = content ? content.length : 0

            if (msgLength > 0) {
                const charDelay = 30 + Math.floor(Math.random() * 40) // 30ms to 70ms per char
                const totalTypingTime = 1000 + (msgLength * charDelay)

                // Thinking Pauses: For messages > 50 characters, insert a 1-3s "pause" midway
                if (msgLength > 50) {
                    const splitPoint = Math.floor(totalTypingTime / 2)
                    const pauseDuration = 1000 + Math.floor(Math.random() * 2000) // 1-3s pause

                    Logger.debug(`Simulating long typing for ${chatId}: ${totalTypingTime}ms with ${pauseDuration}ms pause`)

                    // Type first half
                    await new Promise(resolve => setTimeout(resolve, splitPoint))

                    // Pause (stop typing)
                    await chat.clearState()
                    await new Promise(resolve => setTimeout(resolve, pauseDuration))

                    // Resume typing second half
                    await chat.sendStateTyping()
                    await new Promise(resolve => setTimeout(resolve, splitPoint))
                } else {
                    Logger.debug(`Simulating typing for ${chatId}: ${totalTypingTime}ms`)
                    await new Promise(resolve => setTimeout(resolve, totalTypingTime))
                }
            } else {
                // Fallback for empty/media messages without caption
                const randomDelay = Math.floor(Math.random() * 2000) + 2000
                await new Promise(resolve => setTimeout(resolve, randomDelay))
            }

            // 4. Stop typing
            await chat.clearState()
        } catch (err) {
            // It might fail if chat doesn't exist (new contact), which is expected
            // In that case, we can't do much, but the attempt itself is recorded by WPP
            Logger.debug(`simulatePresence skipped/failed for ${chatId}: ${err.message}`)
        }
    }

    /**
     * Get recipient contact info for placeholders
     * @param {Client} client 
     * @param {string} chatId 
     * @returns {Promise<object>}
     */
    async getRecipientContact(client, chatId) {
        try {
            const contact = await client.getContactById(chatId)
            return {
                name: contact.name || contact.pushname || chatId.split('@')[0],
                pushname: contact.pushname || '',
                phone: chatId.split('@')[0]
            }
        } catch (err) {
            return {
                name: chatId.split('@')[0],
                phone: chatId.split('@')[0]
            }
        }
    }

    /**
     * Send bulk messages
     * @param {string} clientId - Device token
     * @param {Array} recipients - Array of {to, message} objects
     * @param {number} delay - Delay between messages in ms
     * @returns {Promise<object>}
     */
    async sendBulkMessages(clientId, recipients, delay = 1000) {
        const results = {
            total: recipients.length,
            success: 0,
            failed: 0,
            errors: [],
        }

        for (let i = 0; i < recipients.length; i++) {
            const { to, message, options } = recipients[i]

            // Apply delay BEFORE message (except perhaps the very first one if requested, 
            // but bulk usually implies a stream where we want delay starting from the first)
            if (delay > 0) {
                // Add some randomization (+/- 30%) to the base delay
                const randomizedDelay = Math.floor(delay * (0.7 + Math.random() * 0.6))
                await new Promise((resolve) => setTimeout(resolve, randomizedDelay))
            }

            try {
                await this.sendMessage(clientId, to, message, options || {})
                results.success++
            } catch (err) {
                results.failed++
                results.errors.push({
                    to,
                    error: err.message,
                })
            }
        }

        Logger.info(`Bulk messages sent from ${clientId}`, results)

        return results
    }

    /**
     * Get all chats
     * @param {string} clientId - Device token
     * @returns {Promise<Array>}
     */
    async getChats(clientId) {
        const client = this.whatsappInit.getClient(clientId)

        if (!client) {
            throw new Error(`Client ${clientId} not found`)
        }

        if (!this.whatsappInit.isClientReady(clientId)) {
            throw new Error(`Client ${clientId} is not ready`)
        }

        try {
            // Check if page/frame is still valid before calling
            const chats = await client.getChats()
            Logger.debug(`Retrieved ${chats.length} chats for ${clientId}`)

            return chats.map((chat) => ({
                id: chat.id._serialized,
                name: chat.name,
                isGroup: chat.isGroup,
                isReadOnly: chat.isReadOnly,
                unreadCount: chat.unreadCount,
                timestamp: chat.timestamp,
                archived: chat.archived,
                pinned: chat.pinned,
            }))
        } catch (err) {
            if (err.message.includes('detached Frame') || err.message.includes('Execution context was destroyed')) {
                Logger.warn(`Transient browser error while getting chats for ${clientId}: ${err.message}. Triggering recovery...`)
                this.whatsappInit.reconnect(clientId).catch(() => { })
                return []
            }
            Logger.error(`Failed to get chats for ${clientId}`, err)
            throw err
        }
    }

    /**
     * Get all contacts
     * @param {string} clientId - Device token
     * @returns {Promise<Array>}
     */
    async getContacts(clientId) {
        const client = this.whatsappInit.getClient(clientId)

        if (!client) {
            throw new Error(`Client ${clientId} not found`)
        }

        if (!this.whatsappInit.isClientReady(clientId)) {
            throw new Error(`Client ${clientId} is not ready`)
        }

        try {
            // Check if page/frame is still valid before calling
            const contacts = await client.getContacts()
            Logger.debug(`Retrieved ${contacts.length} contacts for ${clientId}`)

            return contacts.map((contact) => ({
                id: contact.id._serialized,
                number: contact.number,
                name: contact.name,
                pushname: contact.pushname,
                isBusiness: contact.isBusiness,
                isEnterprise: contact.isEnterprise,
                isMyContact: contact.isMyContact,
            }))
        } catch (err) {
            if (err.message.includes('detached Frame') || err.message.includes('Execution context was destroyed')) {
                Logger.warn(`Transient browser error while getting contacts for ${clientId}: ${err.message}. Triggering recovery...`)
                this.whatsappInit.reconnect(clientId).catch(() => { })
                return []
            }
            Logger.error(`Failed to get contacts for ${clientId}`, err)
            throw err
        }
    }

    /**
     * Sync contacts to database
     * @param {string} clientId - Device token
     * @returns {Promise<object>}
     */
    async syncContacts(clientId) {
        try {
            const contacts = await this.getContacts(clientId)
            const Contact = db.models.Contact

            // Prepare data for bulk upsert
            const contactData = contacts
                .filter(c => {
                    if (!c.id) return false;

                    // Skip Groups
                    if (c.id.endsWith('@g.us') || c.isGroup) return false;

                    // Skip LID and Broadcast
                    if (c.id.endsWith('@lid') || c.id.includes('@broadcast')) return false;

                    // Ensure individual contact
                    if (!c.id.endsWith('@c.us')) return false;

                    // Skip unidentified non-contacts
                    if (!c.name && !c.pushname && !c.isMyContact) return false;

                    return true;
                })
                .map(contact => {
                    // Extract number from ID if missing
                    let phone = contact.number || contact.id.split('@')[0] || 'Unknown';
                    let displayName = contact.name || contact.pushname || phone;

                    return {
                        token: Hash.token(),
                        device_token: clientId,
                        whatsapp_id: contact.id,
                        phone: phone.substring(0, 30),
                        name: displayName.substring(0, 190),
                        push_name: (contact.pushname || '').substring(0, 190),
                        is_business: !!contact.isBusiness,
                        is_enterprise: !!contact.isEnterprise,
                        is_my_contact: !!contact.isMyContact,
                        last_synced_at: new Date()
                    };
                });

            if (contactData.length === 0) {
                return { success: true, total: 0, synced: 0 };
            }

            // Use bulkCreate with updateOnDuplicate (for MySQL/MariaDB)
            // We ignore errors on individual rows if possible, but bulkCreate is all-or-nothing in most dialects
            // unless we use ignoreDuplicates.
            const result = await Contact.bulkCreate(contactData, {
                updateOnDuplicate: [
                    'phone', 'name', 'push_name',
                    'is_business', 'is_enterprise',
                    'is_my_contact', 'last_synced_at'
                ],
                hooks: false
            })

            Logger.info(`Contacts synced for ${clientId}`, { total: contacts.length })

            return {
                success: true,
                total: contacts.length,
                synced: result.length
            }
        } catch (err) {
            Logger.error(`Failed to sync contacts for ${clientId}`, err)
            throw err
        }
    }

    /**
     * Check if number is registered on WhatsApp
     * @param {string} clientId - Device token
     * @param {string} number - Phone number to check
     * @returns {Promise<boolean>}
     */
    async isRegisteredUser(clientId, number) {
        const client = this.whatsappInit.getClient(clientId)

        if (!client) {
            throw new Error(`Client ${clientId} not found`)
        }

        try {
            const numberId = number.includes('@') ? number : `${number}@c.us`
            const isRegistered = await client.isRegisteredUser(numberId)
            return isRegistered
        } catch (err) {
            Logger.error(`Failed to check if ${number} is registered for ${clientId}`, err)
            throw err
        }
    }

    /**
     * Get client state
     * @param {string} clientId - Device token
     * @returns {Promise<string|null>}
     */
    async getState(clientId) {
        const client = this.whatsappInit.getClient(clientId)

        if (!client) {
            return null
        }

        try {
            const state = await client.getState()
            return state
        } catch (err) {
            Logger.error(`Failed to get state for ${clientId}`, err)
            return null
        }
    }

    /**
     * Logout client
     * @param {string} clientId - Device token
     * @returns {Promise<void>}
     */
    async logout(clientId) {
        const client = this.whatsappInit.getClient(clientId)

        if (!client) {
            throw new Error(`Client ${clientId} not found`)
        }

        try {
            Logger.info(`Logging out client ${clientId}...`)
            await client.logout()
            await this.whatsappInit.destroyClient(clientId, true)

            // Update device in database
            const Device = db.models.Device
            await Device.update(
                {
                    is_logged_out: true,
                    logged_out_at: new Date(),
                    status: 'disconnected',
                },
                {
                    where: { token: clientId },
                },
            )

            Logger.info(`Client ${clientId} logged out successfully`)
        } catch (err) {
            Logger.error(`Failed to logout client ${clientId}`, err)
            // Force destroy even on error
            await this.whatsappInit.destroyClient(clientId, true)
            throw err
        }
    }

    /**
     * Save message to history
     * @param {string} clientId - Device token
     * @param {object} data - Message data
     * @returns {Promise<void>}
     */
    async saveMessageHistory(clientId, data) {
        try {
            const MessageHistory = db.models.MessageHistory
            const { user_token, ...historyData } = data

            await MessageHistory.create({
                token: Hash.token(),
                device_token: clientId,
                user_token: user_token || null,
                ...historyData,
            })
        } catch (err) {
            Logger.error(`Failed to save message history for ${clientId}`, err)
        }
    }

    /**
     * Get media type from mimetype
     * @param {string} mimetype
     * @returns {string}
     */
    getMediaType(mimetype) {
        if (!mimetype) return 'document'

        if (mimetype.startsWith('image/')) return 'image'
        if (mimetype.startsWith('video/')) return 'video'
        if (mimetype.startsWith('audio/')) return 'audio'

        return 'document'
    }
}

module.exports = WhatsAppActions
