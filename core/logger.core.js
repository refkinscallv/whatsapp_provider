'use strict'
const winston = require('winston')
const path = require('path')
const fs = require('fs')
const config = require('@app/config')

class Logger {
    static logger = null

    static init() {
        const logDir = path.join(__dirname, '..', config.app.log_dir)

        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true })
        }

        const customFormat = winston.format.printf((info) => {
            const timestamp = info.timestamp
            const layer = info.context ? info.context.toUpperCase() : 'SYSTEM'
            const status = info.level.toUpperCase()

            // Handle if message is an object or has a stack
            let message = info.message
            if (typeof message === 'object') {
                message = JSON.stringify(message)
            }
            if (info.stack) {
                message = info.stack
            }

            return `${timestamp} | ${layer} | ${status} : ${message}`
        })

        const logFormat = winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            customFormat
        )

        const consoleFormat = winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.printf((info) => {
                const timestamp = info.timestamp
                const layer = info.context ? info.context.toUpperCase() : 'SYSTEM'

                const colors = {
                    error: '\x1b[31m',
                    warn: '\x1b[33m',
                    info: '\x1b[32m',
                    debug: '\x1b[36m',
                    reset: '\x1b[0m',
                }

                const levelColor = colors[info.level] || colors.reset
                const status = info.level.toUpperCase()

                let message = info.message
                if (typeof message === 'object') {
                    message = JSON.stringify(message)
                }
                if (info.stack) {
                    message = info.stack
                }

                return `${timestamp} | ${layer} | ${levelColor}${status}${colors.reset} : ${message}`
            })
        )

        this.logger = winston.createLogger({
            level: config.app.production ? 'info' : 'debug',
            format: logFormat,
            transports: [
                new winston.transports.File({
                    filename: path.join(logDir, 'error.log'),
                    level: 'error',
                    maxsize: 5242880,
                    maxFiles: 5,
                }),
                new winston.transports.File({
                    filename: path.join(logDir, 'combined.log'),
                    maxsize: 5242880,
                    maxFiles: 5,
                }),
                new winston.transports.Console({
                    format: consoleFormat,
                }),
            ],
        })
    }

    static info(context, ...args) {
        if (!this.logger) this.init()
        let message = args.map(arg =>
            typeof arg === 'object' ? (arg instanceof Error ? arg.stack : JSON.stringify(arg)) : arg
        ).join(' ')

        if (args.length === 0) {
            message = context
            context = 'SYSTEM'
        }
        this.logger.info(message, { context })
    }

    static error(context, ...args) {
        if (!this.logger) this.init()
        let message = args.map(arg =>
            typeof arg === 'object' ? (arg instanceof Error ? arg.stack : JSON.stringify(arg)) : arg
        ).join(' ')

        if (args.length === 0) {
            message = context
            context = 'SYSTEM'
        }
        this.logger.error(message, { context })

        // Broadcast to admin socket
        try {
            const Socket = require('@core/socket.core')
            const io = Socket.getInstance()
            if (io) {
                io.to('admin').emit('system:error', {
                    context,
                    message: message,
                    timestamp: new Date()
                })
            }
        } catch (err) {
            // Silently fail to avoid infinite loop
        }
    }

    static warn(context, ...args) {
        if (!this.logger) this.init()
        let message = args.map(arg =>
            typeof arg === 'object' ? (arg instanceof Error ? arg.stack : JSON.stringify(arg)) : arg
        ).join(' ')

        if (args.length === 0) {
            message = context
            context = 'SYSTEM'
        }
        this.logger.warn(message, { context })
    }

    static debug(context, ...args) {
        if (!this.logger) this.init()
        let message = args.map(arg =>
            typeof arg === 'object' ? (arg instanceof Error ? arg.stack : JSON.stringify(arg)) : arg
        ).join(' ')

        if (args.length === 0) {
            message = context
            context = 'SYSTEM'
        }
        this.logger.debug(message, { context })
    }

    static set(error, context = 'SYSTEM') {
        if (!this.logger) this.init()
        const message = error instanceof Error ? error.stack : (typeof error === 'object' ? JSON.stringify(error) : error)
        this.logger.error(message, { context })

        // Broadcast to admin socket
        try {
            const Socket = require('@core/socket.core')
            const io = Socket.getInstance()
            if (io) {
                io.to('admin').emit('system:error', {
                    context,
                    message: error.message || error,
                    timestamp: new Date()
                })
            }
        } catch (err) {
            // Silently fail
        }
    }
}

module.exports = Logger
