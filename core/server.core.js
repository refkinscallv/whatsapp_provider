'use strict'

/**
 * Server Core Module
 * Manages HTTP/HTTPS server creation and lifecycle
 * Handles server listening and port binding
 */

const http = require('http')
const https = require('https')
const fs = require('fs')
const config = require('@app/config')
const Logger = require('@core/logger.core')

module.exports = class Server {
    /**
     * Create HTTP or HTTPS server
     * Based on configuration, creates either HTTP or HTTPS server
     * @param {Object} app - Express application instance
     * @returns {Object} HTTP/HTTPS server instance
     * @static
     */
    static create(app) {
        try {
            Logger.info('server', 'Creating server...')

            // Create HTTPS server if enabled in config
            if (config.server.https) {
                const options = {
                    cert: fs.readFileSync(config.server.ssl.cert),
                    key: fs.readFileSync(config.server.ssl.key),
                }
                return https.createServer(options, app)
            }

            // Create HTTP server
            return http.createServer(config.server.options, app)
        } catch (err) {
            Logger.set(err, 'server')
            throw err
        }
    }

    /**
     * Start server listening on specified port
     * Binds server to port and starts accepting connections
     * @param {Object} server - HTTP/HTTPS server instance
     * @param {number} port - Port number to listen on
     * @returns {Promise<void>}
     * @static
     */
    static listen(server, port) {
        return new Promise((resolve, reject) => {
            // Handle server errors
            server.once('error', (err) => {
                Logger.set(err, 'server')
                reject(err)
            })

            // Start listening
            server.listen(port, () => {
                Logger.info('server', `Server listening on port ${port}`)
                Logger.info('server', `Application is running on ${config.server.host + (port ? `:${port}` : '')}`)
                resolve()
            })
        })
    }
}
