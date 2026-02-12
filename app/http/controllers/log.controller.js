'use strict'

const Logger = require('@core/logger.core')

/**
 * Log Controller
 * Handles receiving and storing logs from various sources
 */
class LogController {
    /**
     * Receiver for client-side errors
     * POST /api/logs/client
     */
    async clientError({ req, res }) {
        try {
            const { error, url, line, col, stack } = req.body
            const user = req.user ? req.user.email : 'Guest'

            const logMessage = `[Client Error] User: ${user} | URL: ${url} | Line: ${line}:${col} | Message: ${error}\nStack: ${stack}`

            Logger.error('frontend', logMessage)

            return res.status(200).json({
                success: true,
                message: 'Client log received'
            })
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message })
        }
    }
}

module.exports = LogController
