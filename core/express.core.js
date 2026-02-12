'use strict'

/**
 * Express Core Module
 * Handles Express application initialization, middleware setup, and routing
 */

const express = require('express')
const qs = require('qs')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const expressLayouts = require('express-ejs-layouts')
const fileUpload = require('express-fileupload')
const Routes = require('@refkinscallv/express-routing')
const config = require('@app/config')
const Logger = require('@core/logger.core')

module.exports = class Express {
    static app = express()
    static router = express.Router()

    /**
     * Get Express application instance
     * @returns {Object} Express app instance
     */
    static instance() {
        return this.app
    }

    /**
     * Initialize Express application
     * Sets up middlewares and routes
     */
    static init() {
        Logger.info('express', 'Preparing middlewares and routes...')
        this.#middlewares()
        this.#routes()
        Logger.info('express', 'Middlewares and routes are ready')
    }

    /**
     * Setup Express middlewares
     * @private
     */
    static #middlewares() {
        try {
            // Trust proxy settings
            this.app.set('trust proxy', config.express.trustProxy)

            // Query string parser
            this.app.set('query parser', (str) => qs.parse(str))

            // Body parsers
            this.app.use(express.json())
            this.app.use(express.urlencoded({ extended: true }))

            // Cookie parser
            this.app.use(cookieParser())

            // CORS middleware
            this.app.use(cors(config.express.cors))

            // File upload middleware
            this.app.use(fileUpload(config.express.fileupload))

            // Expose req to views
            this.app.use((req, res, next) => {
                res.locals.req = req
                res.locals.user = req.user || null
                res.locals.config = config
                next()
            })

            // Static files
            if (config.express.static.status) {
                this.app.use(config.express.static.alias, express.static(config.express.static.path))
            }

            // View engine
            if (config.express.view.status) {
                this.app.use(expressLayouts)
                this.app.set('view engine', config.express.view.engine)
                this.app.set('views', config.express.view.path)
                this.app.set('layout', 'layouts/main') // Set default layout
                this.app.set('layout extractScripts', true)
                this.app.set('layout extractStyles', true)
            }

            // Register custom middlewares
            require('@app/http/middlewares/register.middleware').register(this.app)
        } catch (err) {
            Logger.set(err, 'express')
        }
    }

    /**
     * Setup application routes
     * @private
     */
    static #routes() {
        try {
            require('@app/routes/register.route')
            Routes.apply(this.router)
            this.app.use(this.router)
            Routes.allRoutes().forEach((v, _) => {
                Logger.debug('routes defined', `[${v.methods.map(mtd => mtd.trim()).join(', ')}] ${v.path}`)
            })
        } catch (err) {
            Logger.set(err, 'express')
            throw new Error(`Failed to load routes: ${err.message}`)
        }
    }
}
