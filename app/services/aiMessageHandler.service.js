'use strict'

const Logger = require('@core/logger.core')
const aiSessionService = require('./aiSession.service')
const aiAutomationService = require('./aiAutomation.service')

/**
 * AI Message Handler Service
 * Handles incoming WhatsApp messages and triggers AI automation
 */
class AiMessageHandlerService {
    constructor() {
        this.processingMessages = new Set()
    }

    /**
     * Process incoming WhatsApp message
     * @param {object} whatsappClient - WhatsApp client instance
     * @param {object} message - WhatsApp message object
     * @param {string} deviceToken - Device token
     * @returns {Promise<boolean>} - True if handled by AI, false otherwise
     */
    async handleMessage(whatsappClient, message, deviceToken) {
        const messageId = message.id?._serialized || message.id

        if (this.processingMessages.has(messageId)) {
            Logger.debug(`[AI] Already processing message ${messageId}, skipping duplicate.`)
            return true
        }

        try {
            this.processingMessages.add(messageId)

            // Get AI session for this device
            const session = await aiSessionService.getSessionByDevice(deviceToken)

            // No active session for this device
            if (!session) {
                return false
            }

            // Check if message is from a contact (not from self)
            if (message.fromMe) {
                return false
            }

            // Get chat ID
            const chatId = message.from || message.chatId

            // Extract user message
            const userMessage = message.body || message.caption || ''

            if (!userMessage.trim()) {
                return false
            }

            Logger.info(`[AI] Processing message from ${chatId} on device ${deviceToken}`)

            // Log conversation start
            const conversation = await aiSessionService.logConversation(
                session.id,
                deviceToken,
                chatId,
                userMessage,
                session.ai_model
            )

            const startTime = Date.now()

            // Send typing indicator
            await this.sendTypingIndicator(whatsappClient, chatId)

            // Build prompt with knowledge injection
            const fullPrompt = aiSessionService.buildPromptWithKnowledge(session, userMessage)

            // Query AI
            try {
                const aiResponse = await aiAutomationService.queryAI(
                    deviceToken,
                    session.ai_model,
                    fullPrompt
                )

                const responseTime = Date.now() - startTime

                // Update conversation log
                await aiSessionService.updateConversation(
                    conversation.token,
                    aiResponse,
                    responseTime,
                    'completed'
                )

                // Send AI response to user
                await whatsappClient.sendMessage(chatId, aiResponse)

                Logger.info(`[AI] Response sent to ${chatId} in ${responseTime}ms`)

                return true

            } catch (aiError) {
                const responseTime = Date.now() - startTime

                // Log error
                Logger.error(`[AI] Error querying AI for ${chatId}:`, aiError)

                // Update conversation with error
                await aiSessionService.updateConversation(
                    conversation.token,
                    null,
                    responseTime,
                    'failed',
                    aiError.message
                )

                // Send fallback message to user
                const fallbackMessage = session.language === 'en'
                    ? 'Sorry, I encountered an error processing your message. Please try again later.'
                    : 'Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi nanti.'

                await whatsappClient.sendMessage(chatId, fallbackMessage)

                return true // Still considered handled
            }

        } catch (error) {
            Logger.error(`[AI] Error in handleMessage:`, error)
            return false
        } finally {
            // Remove from processing set after a delay to ensure same event doesn't trigger again
            setTimeout(() => this.processingMessages.delete(messageId), 30000)
        }
    }

    /**
     * Send typing indicator to chat
     * @param {object} whatsappClient - WhatsApp client instance
     * @param {string} chatId - Chat ID
     * @returns {Promise<void>}
     */
    async sendTypingIndicator(whatsappClient, chatId) {
        try {
            if (typeof whatsappClient.sendPresence === 'function') {
                await whatsappClient.sendPresence(chatId, 'composing')

                // Clear typing state after a few seconds
                setTimeout(async () => {
                    try {
                        await whatsappClient.sendPresence(chatId, 'paused')
                    } catch (err) {
                        // Ignore errors clearing state
                    }
                }, 10000)
            }
        } catch (error) {
            // Typing indicator is non-critical, log but don't throw
            Logger.warn(`[AI] Failed to send typing indicator:`, error)
        }
    }

    /**
     * Check if this is a new conversation (first message in chat)
     * @param {object} whatsappClient - WhatsApp client instance
     * @param {string} chatId - Chat ID
     * @returns {Promise<boolean>}
     */
    async isNewConversation(whatsappClient, chatId) {
        try {
            // This method heavily depends on provider capabilities.
            // For now, let's keep it simple or safe.
            if (typeof whatsappClient.getChatById !== 'function') {
                return false // Assume not new if interface not supported
            }

            const chat = await whatsappClient.getChatById(chatId)
            if (!chat || typeof chat.fetchMessages !== 'function') return false

            // Fetch recent messages (last 10)
            const messages = await chat.fetchMessages({ limit: 10 })

            // Check if there are any previous messages from the bot
            const hasPreviousMessages = messages.some(msg => msg.fromMe)

            return !hasPreviousMessages
        } catch (error) {
            Logger.warn(`[AI] Failed to check if new conversation:`, error)
            return false
        }
    }
}

module.exports = new AiMessageHandlerService()
