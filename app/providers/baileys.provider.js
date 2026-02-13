'use strict'

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidDecode,
    downloadContentFromMessage
} = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const BaseProvider = require('./base.provider')
const Logger = require('@core/logger.core')
const path = require('path')
const fs = require('fs')

class BaileysProvider extends BaseProvider {
    constructor(clientId, options = {}) {
        super(clientId, options)
        this.sessionsDir = options.sessionsDir || './whatsapp_sessions'
        this.sessionPath = path.join(this.sessionsDir, `baileys-session-${clientId}`)
        // Simple in-memory store for contacts and chats
        this.store = {
            contacts: {},
            chats: {}
        }
        this.client = null
        this.qr = null
    }

    async initialize() {
        const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath)
        const { version, isLatest } = await fetchLatestBaileysVersion()

        Logger.info(`Starting Baileys v${version.join('.')} (Latest: ${isLatest}) for ${this.clientId}`)

        this.client = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: ['WARF Gateway', 'Chrome', '1.0.0'],
            generateHighQualityLinkPreview: true,
        })

        // Manually handle store updates
        this.client.ev.on('contacts.update', (contacts) => {
            for (const contact of contacts) {
                this.store.contacts[contact.id] = contact
            }
        })

        this.client.ev.on('contacts.upsert', (contacts) => {
            for (const contact of contacts) {
                this.store.contacts[contact.id] = contact
            }
        })

        this.client.ev.on('chats.update', (chats) => {
            for (const chat of chats) {
                this.store.chats[chat.id] = { ...this.store.chats[chat.id], ...chat }
            }
        })

        this.client.ev.on('chats.upsert', (chats) => {
            for (const chat of chats) {
                this.store.chats[chat.id] = chat
            }
        })

        this.client.ev.on('creds.update', saveCreds)

        this.client.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update

            if (qr) {
                this.qr = qr
                this.emit('qr', qr)
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error instanceof Boom) ?
                    lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true

                Logger.warn(`Connection closed for ${this.clientId}. Reconnecting: ${shouldReconnect}`, lastDisconnect.error)

                this.updateState('disconnected')
                this.emit('disconnected', shouldReconnect ? 'reconnecting' : 'logged_out')

                if (shouldReconnect) {
                    this.initialize()
                }
            } else if (connection === 'open') {
                Logger.info(`Baileys connection opened for ${this.clientId}`)
                this.qr = null
                this.updateState('ready')

                const decodedId = jidDecode(this.client.user.id)
                this.emit('ready', {
                    wid: decodedId.user,
                    pushname: this.client.user.name || '',
                    platform: 'baileys'
                })
            }
        })

        this.client.ev.on('messages.upsert', async (m) => {
            if (m.type === 'notify') {
                for (const msg of m.messages) {
                    if (!msg.key.fromMe) {
                        this.emit('message', this.mapMessage(msg))
                    }
                }
            }
        })
    }

    mapMessage(baileysMsg) {
        // Map Baileys message structure to common structure
        const id = baileysMsg.key.id
        const from = baileysMsg.key.remoteJid
        const fromMe = baileysMsg.key.fromMe
        const pushName = baileysMsg.pushName

        let body = ''
        let type = 'chat'

        const message = baileysMsg.message
        if (!message) return null

        // Basic text message
        if (message.conversation) {
            body = message.conversation
            type = 'chat'
        } else if (message.extendedTextMessage) {
            body = message.extendedTextMessage.text
            type = 'chat'
        } else if (message.imageMessage) {
            body = message.imageMessage.caption || ''
            type = 'image'
        } else if (message.videoMessage) {
            body = message.videoMessage.caption || ''
            type = 'video'
        } else if (message.audioMessage) {
            type = 'audio'
        } else if (message.documentMessage) {
            body = message.documentMessage.title || message.documentMessage.caption || ''
            type = 'document'
        }

        return {
            id: { _serialized: id },
            from,
            to: this.client.user.id,
            body,
            type,
            timestamp: baileysMsg.messageTimestamp,
            fromMe,
            _raw: baileysMsg
        }
    }

    async destroy() {
        if (this.client) {
            this.client.ev.removeAllListeners()
            this.client.end()
        }
    }

    async sendMessage(to, content, options = {}) {
        const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
        let payload = {}

        if (typeof content === 'string') {
            payload = { text: content }
        } else {
            // Handle complex content or media in sendMessage if passed directly
            payload = content
        }

        const result = await this.client.sendMessage(jid, payload)
        return {
            id: { _serialized: result.key.id },
            timestamp: result.messageTimestamp
        }
    }

    async sendMedia(to, media, options = {}) {
        const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
        let content = {}

        const mediaSource = media.url ? { url: media.url } : { buffer: Buffer.from(media.data, 'base64') }

        if (media.mimetype.startsWith('image/')) {
            content = { image: mediaSource, caption: options.caption }
        } else if (media.mimetype.startsWith('video/')) {
            content = { video: mediaSource, caption: options.caption }
        } else if (media.mimetype.startsWith('audio/')) {
            content = { audio: mediaSource, mimetype: media.mimetype, ptt: options.ptt }
        } else {
            content = { document: mediaSource, mimetype: media.mimetype, fileName: media.filename, caption: options.caption }
        }

        const result = await this.client.sendMessage(jid, content)
        return {
            id: { _serialized: result.key.id },
            timestamp: result.messageTimestamp
        }
    }

    async getChats() {
        // Return chats from our simple in-memory store
        const chats = Object.values(this.store.chats)
        return chats.map(chat => ({
            id: chat.id,
            name: chat.name || '',
            unreadCount: chat.unreadCount || 0,
            timestamp: chat.conversationTimestamp || 0
        }))
    }

    async getContacts() {
        const contacts = Object.values(this.store.contacts)
        return contacts.map(c => ({
            id: c.id,
            number: c.id.split('@')[0],
            name: c.name || c.verifiedName || '',
            pushname: c.notify || ''
        }))
    }

    async getContactById(id) {
        const contact = this.store.contacts[id]
        if (!contact) return { name: id.split('@')[0], phone: id.split('@')[0] }
        return {
            name: contact.name || contact.notify || id.split('@')[0],
            pushname: contact.notify || '',
            phone: id.split('@')[0]
        }
    }

    async isRegisteredUser(id) {
        const jid = id.includes('@') ? id : `${id}@s.whatsapp.net`
        const [result] = await this.client.onWhatsApp(jid)
        return !!(result && result.exists)
    }

    async getState() {
        return this.state === 'ready' ? 'CONNECTED' : 'DISCONNECTED'
    }

    async logout() {
        await this.client.logout()
        // Cleanup session files
        if (fs.existsSync(this.sessionPath)) {
            fs.rmSync(this.sessionPath, { recursive: true, force: true })
        }
    }
}

module.exports = BaileysProvider
