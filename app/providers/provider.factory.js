'use strict'

const WWebJSProvider = require('./wwebjs.provider')
const BaileysProvider = require('./baileys.provider')

/**
 * Provider Factory
 * Creates WhatsApp engine instances based on type
 */
class ProviderFactory {
    static create(type, clientId, options = {}) {
        switch (type.toLowerCase()) {
            case 'baileys':
                return new BaileysProvider(clientId, options)
            case 'wwebjs':
            case 'whatsapp-web.js':
                return new WWebJSProvider(clientId, options)
            default:
                throw new Error(`Unsupported provider type: ${type}`)
        }
    }
}

module.exports = ProviderFactory
