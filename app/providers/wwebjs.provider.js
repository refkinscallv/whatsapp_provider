'use strict'

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js')
const BaseProvider = require('./base.provider')
const Logger = require('@core/logger.core')
const path = require('path')
const fs = require('fs')

class WWebJSProvider extends BaseProvider {
    constructor(clientId, options = {}) {
        super(clientId, options)

        const sessionsDir = options.sessionsDir || './whatsapp_sessions'
        const chromePath = options.chromePath || undefined
        const userAgent = options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        const viewport = options.viewport || { width: 1920, height: 1080 }

        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId,
                dataPath: sessionsDir,
            }),
            puppeteer: {
                executablePath: chromePath,
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-extensions',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--disable-software-rasterizer',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-infobars',
                    `--window-size=${viewport.width},${viewport.height}`,
                    '--disable-blink-features=AutomationControlled',
                    `--user-agent=${userAgent}`,
                    `--lang=en-US,en`,
                ],
            },
            qrMaxRetries: options.qrMaxRetries || 5,
            userAgent: userAgent,
        })

        this.info = null
        this.setupEventListeners()
    }

    setupEventListeners() {
        this.client.on('qr', (qr) => this.emit('qr', qr))
        this.client.on('authenticated', (session) => this.emit('authenticated', session))
        this.client.on('auth_failure', (message) => this.emit('auth_failure', message))
        this.client.on('ready', () => {
            const info = this.client?.info
            if (info) {
                this.info = {
                    wid: {
                        user: info.wid?.user,
                        _serialized: info.wid?._serialized
                    },
                    pushname: info.pushname,
                    platform: info.platform
                }
            } else {
                this.info = {
                    platform: 'wwebjs'
                }
            }
            this.updateState('ready')
            this.emit('ready', this.info)
        })
        this.client.on('disconnected', (reason) => {
            this.updateState('disconnected')
            this.emit('disconnected', reason)
        })
        this.client.on('message', (message) => this.emit('message', message))
        this.client.on('message_ack', (message, ack) => this.emit('message_ack', message, ack))
        this.client.on('change_state', (state) => this.emit('state_change', state))
        this.client.on('loading_screen', (percent, message) => this.emit('loading_screen', percent, message))
    }

    async initialize() {
        await this.client.initialize()
    }

    async destroy() {
        if (this.client) {
            await this.client.destroy()
        }
    }

    async sendMessage(to, content, options = {}) {
        return await this.client.sendMessage(to, content, options)
    }

    async sendMedia(to, media, options = {}) {
        let messageMedia
        if (media.url) {
            messageMedia = await MessageMedia.fromUrl(media.url)
        } else if (media.data) {
            messageMedia = new MessageMedia(media.mimetype, media.data, media.filename)
        } else {
            throw new Error('Media data or URL is required')
        }
        return await this.client.sendMessage(to, messageMedia, options)
    }

    async sendPresence(to, presence) {
        const chat = await this.client.getChatById(to)
        if (presence === 'composing') {
            await chat.sendStateTyping()
        } else if (presence === 'recording') {
            await chat.sendStateRecording()
        } else {
            await chat.clearState()
        }
    }

    async getChats() {
        return await this.client.getChats()
    }

    async getContacts() {
        return await this.client.getContacts()
    }

    async getContactById(id) {
        return await this.client.getContactById(id)
    }

    async isRegisteredUser(id) {
        return await this.client.isRegisteredUser(id)
    }

    async getState() {
        return await this.client.getState()
    }

    async logout() {
        await this.client.logout()
    }
}

module.exports = WWebJSProvider
