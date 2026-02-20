'use strict'

/**
 * Error Handler Core Module
 * Handles global application errors and provides appropriate responses
 */

const Logger = require('@core/logger.core')
const config = require('@app/config')

module.exports = class ErrorHandler {
    /**
     * Initialize global error handler
     * @param {Object} app - Express application instance
     */
    static init(app) {
        // Register global process error handlers to prevent app from crashing 
        // on library-level async errors (like Puppeteer/wwebjs detached frames)
        process.on('unhandledRejection', (reason, promise) => {
            Logger.error('GLOBAL', 'Unhandled Rejection at:', promise, 'reason:', reason)

            // In production, we don't want to kill the process
            if (!config.app.production) {
                // In development, maybe we want to see it clearly
                // process.exit(1)
            }
        })

        process.on('uncaughtException', (err, origin) => {
            Logger.error('GLOBAL', 'Uncaught Exception:', err, 'origin:', origin)

            // In production, we don't want to kill the process
            if (!config.app.production) {
                // process.exit(1)
            }
        })

        // Register 404 handler first
        this.#register404Handler(app)

        // Register global error handler last
        this.#registerErrorHandler(app)
    }

    /**
     * Register 404 Not Found handler
     * @param {Object} app - Express application instance
     * @private
     */
    static #register404Handler(app) {
        app.use((req, res, next) => {
            const status = 404
            const message = 'Page Not Found'

            // Check if it's an API request
            if (req.xhr || req.path.startsWith('/api')) {
                return res.status(status).json({
                    success: false,
                    message,
                })
            }

            // Render 404 page
            res.status(status).render('pages/error.page.ejs', {
                layout: 'layouts/main',
                title: `Error ${status}`,
                status,
                message,
                error: {},
            })
        })
    }

    /**
     * Register global error handler
     * @param {Object} app - Express application instance
     * @private
     */
    static #registerErrorHandler(app) {
        // Global error handler middleware
        app.use((err, req, res, next) => {
            // Log the error
            Logger.set(err, 'error-handler')

            // Extract error details
            const status = err.status || 500
            const message = err.message || 'Internal Server Error'

            // Check if it's an API request (AJAX or API route)
            if (req.xhr || req.path.startsWith('/api')) {
                return res.status(status).json({
                    success: false,
                    message,
                    error: !config.app.production ? err.stack : undefined,
                })
            }

            // Render error page for web requests
            res.status(status).render('pages/error.page.ejs', {
                layout: 'layouts/main',
                title: `Error ${status}`,
                status,
                message,
                error: !config.app.production ? err : {},
            })
        })
    }
}
