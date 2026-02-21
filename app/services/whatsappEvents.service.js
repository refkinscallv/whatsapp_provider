'use strict'

const Logger = require('@core/logger.core')
const db = require('@core/database.core')
const webhookService = require('./webhook.service')
const templateService = require('./template.service')

/**
 * WhatsApp Events Listener Service
 * Handles all WhatsApp client events and updates database
 */
class WhatsAppEvents {
    constructor(whatsappInit, io) {
        this.whatsappInit = whatsappInit
        this.io = io
    }

    /**
     * Register all WhatsApp events for a specific client
     * @param {string} clientId - The client identifier (device token)
     * @param {Client} client - WhatsApp client instance
     */
    register(clientId, client) {
        this.registerAuthEvents(clientId, client)
        this.registerConnectionEvents(clientId, client)
        this.registerMessageEvents(clientId, client)
        this.registerGroupEvents(clientId, client)
        this.registerChatEvents(clientId, client)
        this.registerCallEvents(clientId, client)
        this.registerMiscEvents(clientId, client)
    }

    /**
     * Safe event handler wrapper
     */
    safeHandler(clientId, eventName, handler) {
        return async (...args) => {
            try {
                await handler(...args)
            } catch (err) {
                Logger.error(`Error in ${eventName} handler for ${clientId}`, err)

                if (this.io) {
                    this.io.to(`client:${clientId}`).emit('whatsapp:error', {
                        clientId,
                        event: eventName,
                        error: err.message,
                    })
                }
            }
        }
    }

    /**
     * Emit to Socket.IO and EventEmitter
     * Ensures database is updated first (done in handlers)
     * Adds delay for Socket.IO if needed to ensure FE is ready
     */
    emit(clientId, event, data, broadcast = false, delay = 0) {
        // Internal event emitter (no delay)
        this.whatsappInit.emit(event.replace('whatsapp:', ''), { clientId, ...data })

        if (this.io) {
            const emitLogic = () => {
                // Emit to specific client room
                this.io.to(`client:${clientId}`).emit(event, { clientId, ...data })

                // Broadcast to admin room for all events
                this.io.to('admin').emit(event, { clientId, ...data })

                // Broadcast globally if requested
                if (broadcast) {
                    this.io.emit(`${event}:broadcast`, { clientId, ...data })
                }
            }

            if (delay > 0) {
                setTimeout(emitLogic, delay)
            } else {
                emitLogic()
            }
        }
    }

    /**
     * Update client state in database and memory
     */
    async updateDeviceState(clientId, state, additionalData = {}) {
        this.whatsappInit.updateState(clientId, state)

        try {
            const Device = db.models.Device
            const device = await Device.findOne({ where: { token: clientId } })

            if (device) {
                const updatePayload = {
                    status: state,
                    ...additionalData,
                }

                // If data is provided, MERGE it with existing data
                if (additionalData.data) {
                    updatePayload.data = {
                        ...(device.data || {}),
                        ...additionalData.data
                    }
                }

                await device.update(updatePayload)
            }

            // Emit state change to Socket.IO for real-time UI updates
            this.emit(clientId, 'whatsapp:state_change', {
                state,
                ...additionalData
            }, true)
        } catch (err) {
            Logger.error(`Failed to update device state in DB for ${clientId}`, err)
        }
    }

    /**
     * Trigger client re-initialization (to show QR again)
     */
    async triggerReinitialization(clientId) {
        // Prevent double re-initialization if already in progress
        const currentState = this.whatsappInit.clientStates.get(clientId)
        if (currentState === 'initializing' || currentState === 'prepare') {
            Logger.debug(`Re-initialization already in progress for ${clientId}, skipping...`)
            return
        }

        Logger.info(`Triggering automatic re-initialization for client ${clientId} to show QR code`)

        try {
            const Device = db.models.Device
            const device = await Device.findOne({ where: { token: clientId } })

            if (!device) {
                Logger.error(`Cannot trigger re-initialization: Device ${clientId} not found`)
                return
            }

            // Update status to initializing (must match Device.model.js ENUM)
            await this.updateDeviceState(clientId, 'initializing', {
                qr: null,
                is_auth: false
            })

            // Small delay to ensure previous instance is fully gone
            setTimeout(async () => {
                try {
                    await this.whatsappInit.createClient(clientId, {
                        provider: device.provider || 'wwebjs'
                    })
                    Logger.info(`Re-initialization started for ${clientId}`)
                } catch (err) {
                    Logger.error(`Failed to re-initialize client ${clientId}`, err)
                }
            }, 5000)
        } catch (err) {
            Logger.error(`Error in triggerReinitialization for ${clientId}`, err)
        }
    }

    /**
     * Register authentication related events
     */
    registerAuthEvents(clientId, client) {
        client.on(
            'qr',
            this.safeHandler(clientId, 'qr', async (qr) => {
                // 1. Update DB First
                await this.updateDeviceState(clientId, 'qr', { qr })
                Logger.info(`QR code received for ${clientId}`)

                // 2. Emit to socket/internal after DB is done
                // Adding a small delay for QR to ensure FE is ready to receive
                this.emit(clientId, 'whatsapp:qr', { qr }, true, 1000)
            }),
        )

        client.on(
            'code',
            this.safeHandler(clientId, 'code', async (code) => {
                Logger.info(`Pairing code received for ${clientId}: ${code}`)
                this.emit(clientId, 'whatsapp:code', { code }, true)
            }),
        )

        client.on(
            'authenticated',
            this.safeHandler(clientId, 'authenticated', async (session) => {
                // 1. Update DB First
                await this.updateDeviceState(clientId, 'authenticated', {
                    is_auth: true,
                    authenticated_at: new Date(),
                })
                this.whatsappInit.reconnectAttempts.delete(clientId)
                Logger.info(`Client ${clientId} authenticated`)

                // 2. Notify internal/socket
                this.emit(clientId, 'whatsapp:authenticated', { session }, true, 500)

                // 3. Webhook (Async)
                await webhookService.notify(clientId, 'authenticated', { session })
            }),
        )

        client.on(
            'auth_failure',
            this.safeHandler(clientId, 'auth_failure', async (message) => {
                await this.updateDeviceState(clientId, 'auth_failure', {
                    is_auth: false,
                })
                Logger.error(`Authentication failed for ${clientId}: ${message}`)
                this.emit(clientId, 'whatsapp:auth_failure', { message }, true)
                await webhookService.notify(clientId, 'auth_failure', { message })
                await this.whatsappInit.destroyClient(clientId, true)

                // AUTO RE-INIT: Bring back QR code
                await this.triggerReinitialization(clientId)
            }),
        )

        client.on(
            'remote_session_saved',
            this.safeHandler(clientId, 'remote_session_saved', () => {
                Logger.info(`Remote session saved for ${clientId}`)
                this.emit(clientId, 'whatsapp:remote_session_saved', {})
            }),
        )
    }

    /**
     * Register connection related events
     */
    registerConnectionEvents(clientId, client) {
        client.on(
            'ready',
            this.safeHandler(clientId, 'ready', async (data) => {
                const deviceData = {
                    wid: data?.wid?.user || data?.wid || client.info?.wid?.user,
                    pushname: data?.pushname || client.info?.pushname,
                    platform: data?.platform || client.info?.platform || this.whatsappInit.getProviderType(clientId),
                }

                // 1. Update DB First
                await this.updateDeviceState(clientId, 'ready', {
                    is_auth: true,
                    data: deviceData,
                    qr: null, // Clear QR after success
                })

                Logger.info(`Client ${clientId} is ready`, {
                    phone: deviceData.wid,
                    pushname: deviceData.pushname,
                })

                // 2. Emit with delay to ensure FE is ready
                this.emit(clientId, 'whatsapp:ready', { info: data || client.info }, true, 1000)

                // 3. Webhook (Async)
                await webhookService.notify(clientId, 'ready', { info: data || client.info })
            }),
        )

        client.on(
            'change_state',
            this.safeHandler(clientId, 'change_state', async (state) => {
                await this.updateDeviceState(clientId, state)
                Logger.debug(`Client ${clientId} state changed: ${state}`)

                // Recovery logic for specific states
                if (state === 'TIMEOUT') {
                    Logger.warn(`Client ${clientId} timed out, triggering automatic reconnect...`)
                    // Delay slightly to avoid spamming
                    setTimeout(() => {
                        this.whatsappInit.reconnect(clientId).catch(err => {
                            Logger.error(`Automatic recovery failed for ${clientId}`, err)
                        })
                    }, 5000)
                }

                if (state === 'CONFLICT') {
                    Logger.warn(`Client ${clientId} has a conflict (open elsewhere). Manual intervention may be needed.`)
                    // For conflict, we don't auto-reconnect immediately to avoid infinite "ping-pong" with other session
                }
            }),
        )

        client.on(
            'disconnected',
            this.safeHandler(clientId, 'disconnected', async (reason) => {
                const isLogout = reason === 'LOGOUT' || reason === 'logged_out'
                const isNavigation = reason === 'NAVIGATION'

                await this.updateDeviceState(clientId, 'disconnected', {
                    is_logged_out: isLogout,
                    logged_out_at: isLogout ? new Date() : null,
                    is_auth: isLogout ? false : undefined // Reset auth if it was a logout
                })

                Logger.warn(`Client ${clientId} disconnected: ${reason}`)
                this.emit(clientId, 'whatsapp:disconnected', { reason }, true)
                await webhookService.notify(clientId, 'disconnected', { reason })

                if (isLogout || isNavigation) {
                    // Small delay before destruction to let wwebjs internal state settle
                    // effectively prevents "Attempted to use detached Frame" errors
                    setTimeout(async () => {
                        await this.whatsappInit.destroyClient(clientId, true)

                        // AUTO RE-INIT: Bring back QR code if it was a logout or fatal navigation
                        await this.triggerReinitialization(clientId)
                    }, 2000)
                }
            }),
        )

        client.on(
            'loading_screen',
            this.safeHandler(clientId, 'loading_screen', (percent, message) => {
                Logger.debug(`Client ${clientId} loading: ${percent}% - ${message}`)
                this.emit(clientId, 'whatsapp:loading_screen', { percent, message })
            }),
        )

        client.on(
            'change_battery',
            this.safeHandler(clientId, 'change_battery', async (batteryInfo) => {
                Logger.debug(`Client ${clientId} battery changed`, batteryInfo)

                try {
                    const Device = db.models.Device
                    const device = await Device.findOne({ where: { token: clientId } })
                    if (device) {
                        const currentData = device.data || {}
                        await device.update({
                            data: {
                                ...currentData,
                                battery: batteryInfo.battery,
                                plugged: batteryInfo.plugged,
                            },
                        })
                    }
                } catch (err) {
                    Logger.error(`Failed to update battery status for ${clientId}`, err)
                }

                this.emit(clientId, 'whatsapp:battery_change', { batteryInfo })
            }),
        )
    }

    /**
     * Register message related events
     */
    registerMessageEvents(clientId, client) {
        client.on(
            'message',
            this.safeHandler(clientId, 'message', async (message) => {
                Logger.debug(`Message received on ${clientId}`, {
                    from: message.from,
                    type: message.type,
                    hasMedia: message.hasMedia,
                    preview: message.body?.substring(0, 50),
                })

                const messageData = {
                    id: message.id._serialized,
                    from: message.from,
                    to: message.to,
                    body: message.body,
                    type: message.type,
                    timestamp: message.timestamp,
                    hasMedia: message.hasMedia,
                    isForwarded: message.isForwarded,
                    isStatus: message.isStatus,
                    isStarred: message.isStarred,
                    broadcast: message.broadcast,
                    fromMe: message.fromMe,
                    hasQuotedMsg: message.hasQuotedMsg,
                }

                this.emit(clientId, 'whatsapp:message', { message: messageData })
                await webhookService.notify(clientId, 'message', messageData)

                // 2. AUTO-READ (Anti-Ban Measure)
                // Simulates a user reading their phone
                try {
                    // Get the provider type for this client
                    const providerType = this.whatsappInit.getProviderType(clientId)

                    if (providerType === 'wwebjs') {
                        // WWebJS approach
                        const chat = await message.getChat()
                        await chat.sendSeen()
                    } else if (providerType === 'baileys') {
                        // Baileys approach - use the client directly
                        const client = this.whatsappInit.getClient(clientId)
                        if (client && client.client) {
                            await client.client.readMessages([message._raw.key])
                        }
                    }
                    Logger.debug(`Auto-read triggered for ${message.from} on ${clientId}`)
                } catch (readErr) {
                    Logger.warn(`Failed to trigger auto-read for ${message.from}: ${readErr.message}`)
                }

                // 3. Process AI automation first (if enabled for device)
                if (!message.fromMe) {
                    const aiMessageHandler = require('./aiMessageHandler.service')

                    try {
                        const handledByAI = await aiMessageHandler.handleMessage(client, message, clientId)

                        if (handledByAI) {
                            Logger.info(`Message from ${message.from} handled by AI automation on ${clientId}`)
                            return // AI handled the message, skip regular auto-reply
                        }
                    } catch (aiErr) {
                        Logger.warn(`AI automation failed for ${clientId}, falling back to regular auto-reply: ${aiErr.message}`)
                    }

                    // 4. Fall back to regular auto-reply if AI didn't handle
                    await this.processAutoReply(clientId, message)
                }
            }),
        )

        client.on(
            'message_create',
            this.safeHandler(clientId, 'message_create', async (message) => {
                // If message is from me, it means a message was just successfully sent
                // either via the system or manually. We can use this as a trigger to 
                // process the next item in the queue for this device.
                if (message.fromMe) {
                    const messageQueueService = require('./messageQueue.service')
                    // Small randomized delay before checking next to avoid instant-fire loop
                    const nextCheckDelay = Math.floor(Math.random() * 2000) + 1000
                    setTimeout(() => {
                        messageQueueService.processNextForDevice(clientId).catch(err => {
                            Logger.error(`Failed to trigger next queue item for ${clientId}: ${err.message}`)
                        })
                    }, nextCheckDelay)
                }
            }),
        )

        client.on(
            'message_ack',
            this.safeHandler(clientId, 'message_ack', async (message, ack) => {
                const messageId = message.id._serialized
                Logger.debug(`Message ACK for ${clientId}`, {
                    messageId,
                    ack,
                })

                // 1. Update database
                await this.updateMessageHistoryStatus(messageId, ack)

                // 2. Find user token for this message (History)
                try {
                    const msg = await db.models.MessageHistory.findOne({
                        where: { message_id: messageId },
                        attributes: ['user_token']
                    })

                    if (msg && this.io) {
                        const ackName = this.getAckName(ack)
                        // Emit to user room for cross-page real-time updates
                        this.io.to(`user:${msg.user_token}`).emit('message:ack', {
                            messageId,
                            ack,
                            ackName,
                            deviceToken: clientId
                        })
                    }
                } catch (err) {
                    Logger.warn(`Failed to emit user ACK for ${messageId}: ${err.message}`)
                }

                // Internal/specific room emit
                this.emit(clientId, 'whatsapp:message_ack', {
                    messageId,
                    ack,
                    ackName: this.getAckName(ack),
                })
            }),
        )

        client.on(
            'message_revoke_everyone',
            this.safeHandler(clientId, 'message_revoke_everyone', (message, revokedMsg) => {
                Logger.debug(`Message revoked for everyone on ${clientId}`, {
                    messageId: message.id._serialized,
                })

                this.emit(clientId, 'whatsapp:message_revoke_everyone', {
                    messageId: message.id._serialized,
                    revokedMessage: revokedMsg
                        ? {
                            id: revokedMsg.id._serialized,
                            body: revokedMsg.body,
                        }
                        : null,
                })
            }),
        )

        client.on(
            'media_uploaded',
            this.safeHandler(clientId, 'media_uploaded', (message) => {
                Logger.info(`Media uploaded on ${clientId}`, {
                    messageId: message.id._serialized,
                })

                this.emit(clientId, 'whatsapp:media_uploaded', {
                    messageId: message.id._serialized,
                    type: message.type,
                })
            }),
        )
    }

    /**
     * Register group related events
     */
    registerGroupEvents(clientId, client) {
        client.on(
            'group_join',
            this.safeHandler(clientId, 'group_join', (notification) => {
                Logger.info(`Group join on ${clientId}`, {
                    groupId: notification.chatId,
                    participants: notification.recipientIds,
                })

                this.emit(clientId, 'whatsapp:group_join', {
                    groupId: notification.chatId,
                    participants: notification.recipientIds,
                    author: notification.author,
                    timestamp: notification.timestamp,
                })
            }),
        )

        client.on(
            'group_leave',
            this.safeHandler(clientId, 'group_leave', (notification) => {
                Logger.info(`Group leave on ${clientId}`, {
                    groupId: notification.chatId,
                    participants: notification.recipientIds,
                })

                this.emit(clientId, 'whatsapp:group_leave', {
                    groupId: notification.chatId,
                    participants: notification.recipientIds,
                    author: notification.author,
                    timestamp: notification.timestamp,
                })
            }),
        )

        client.on(
            'group_update',
            this.safeHandler(clientId, 'group_update', (notification) => {
                Logger.info(`Group updated on ${clientId}`, {
                    groupId: notification.chatId,
                    type: notification.type,
                })

                this.emit(clientId, 'whatsapp:group_update', {
                    groupId: notification.chatId,
                    author: notification.author,
                    type: notification.type,
                    timestamp: notification.timestamp,
                })
            }),
        )
    }

    /**
     * Register chat related events
     */
    registerChatEvents(clientId, client) {
        client.on(
            'chat_removed',
            this.safeHandler(clientId, 'chat_removed', (chat) => {
                Logger.info(`Chat removed on ${clientId}`, {
                    chatId: chat.id._serialized,
                })

                this.emit(clientId, 'whatsapp:chat_removed', {
                    chatId: chat.id._serialized,
                    name: chat.name,
                    isGroup: chat.isGroup,
                })
            }),
        )
    }

    /**
     * Register call related events
     */
    registerCallEvents(clientId, client) {
        client.on(
            'call',
            this.safeHandler(clientId, 'call', async (call) => {
                Logger.info(`Call received on ${clientId}`, {
                    callId: call.id,
                    from: call.from,
                    isVideo: call.isVideo,
                    isGroup: call.isGroup,
                })

                this.emit(clientId, 'whatsapp:call', {
                    callId: call.id,
                    from: call.from,
                    timestamp: call.timestamp,
                    isVideo: call.isVideo,
                    isGroup: call.isGroup,
                })

                // AUTO-REJECT (Anti-Ban/Bot Safety)
                // Reject calls from unknown to avoid bot being flagged by hanging calls
                try {
                    Logger.info(`Auto-rejecting call ${call.id} from ${call.from} on ${clientId}`)
                    await call.reject()
                } catch (rejectErr) {
                    Logger.error(`Failed to reject call ${call.id}: ${rejectErr.message}`)
                }
            }),
        )
    }

    /**
     * Register miscellaneous events
     */
    registerMiscEvents(clientId, client) {
        client.on('error', (err) => {
            Logger.error(`Client ${clientId} error`, err)

            this.emit(clientId, 'whatsapp:error', {
                error: err.message,
                stack: err.stack,
            })

            // Broadcast crash to admin
            if (this.io) {
                this.io.to('admin').emit('whatsapp:crash', {
                    clientId,
                    error: err.message,
                    timestamp: new Date()
                })
            }
        })
    }

    /**
     * Process auto-reply rules
     */
    async processAutoReply(clientId, message) {
        try {
            const AutoReplyRule = db.models.AutoReplyRule

            const rules = await AutoReplyRule.findAll({
                where: {
                    device_token: clientId,
                    is_active: true,
                },
                order: [['priority', 'DESC']],
            })

            for (const rule of rules) {
                if (this.matchesPattern(message.body, rule.trigger_type, rule.trigger_pattern)) {
                    // Send auto-reply
                    const client = this.whatsappInit.getClient(clientId)
                    if (client && this.whatsappInit.isClientReady(clientId)) {
                        setTimeout(async () => {
                            try {
                                // Fetch contact for placeholders
                                let contact = {}
                                try {
                                    contact = await client.getContactById(message.from)
                                } catch (cErr) {
                                    Logger.warn(`Failed to fetch contact for auto-reply placeholders: ${cErr.message}`)
                                    contact = {
                                        name: message.from.split('@')[0],
                                        phone: message.from.split('@')[0]
                                    }
                                }

                                // Parse template
                                const finalMessage = templateService.parseTemplate(rule.reply_message, contact)

                                await client.sendMessage(message.from, finalMessage)

                                // Update usage count
                                await rule.update({
                                    usage_count: rule.usage_count + 1,
                                    last_triggered_at: new Date(),
                                })

                                Logger.info(`Auto-reply sent from ${clientId} to ${message.from}`)
                            } catch (err) {
                                Logger.error(`Failed to send auto-reply from ${clientId}`, err)
                            }
                        }, rule.reply_delay)
                    }

                    break // Only trigger first matching rule
                }
            }
        } catch (err) {
            Logger.error(`Failed to process auto-reply for ${clientId}`, err)
        }
    }

    /**
     * Check if message matches pattern
     */
    matchesPattern(text, type, pattern) {
        if (!text) return false

        const lowerText = text.toLowerCase()
        const lowerPattern = pattern.toLowerCase()

        switch (type) {
            case 'exact':
                return lowerText === lowerPattern
            case 'contains':
                return lowerText.includes(lowerPattern)
            case 'starts_with':
                return lowerText.startsWith(lowerPattern)
            case 'ends_with':
                return lowerText.endsWith(lowerPattern)
            case 'regex':
                try {
                    const regex = new RegExp(pattern, 'i')
                    return regex.test(text)
                } catch (err) {
                    Logger.error('Invalid regex pattern', err)
                    return false
                }
            default:
                return false
        }
    }

    /**
     * Update message history status based on ACK
     */
    async updateMessageHistoryStatus(messageId, ack) {
        try {
            const MessageHistory = db.models.MessageHistory

            const updateData = {}

            switch (ack) {
                case 1: // sent
                    updateData.status = 'sent'
                    updateData.sent_at = new Date()
                    break
                case 2: // delivered
                    updateData.status = 'delivered'
                    updateData.delivered_at = new Date()
                    break
                case 3: // read
                    updateData.status = 'read'
                    updateData.read_at = new Date()
                    break
            }

            if (Object.keys(updateData).length > 0) {
                await MessageHistory.update(updateData, {
                    where: { message_id: messageId },
                })
            }
        } catch (err) {
            Logger.error(`Failed to update message history status for ${messageId}`, err)
        }
    }

    /**
     * Get acknowledgement status name
     */
    getAckName(ack) {
        const ackNames = {
            0: 'pending',
            1: 'sent',
            2: 'delivered',
            3: 'read',
            4: 'played',
        }
        return ackNames[ack] || 'unknown'
    }

    /**
     * Remove all event listeners for a client
     */
    removeAllListeners(client) {
        client.removeAllListeners()
        Logger.debug('All event listeners removed')
    }
}

module.exports = WhatsAppEvents
