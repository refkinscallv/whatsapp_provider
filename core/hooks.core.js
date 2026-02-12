'use strict'

/**
 * Hooks Core Module
 * Manages application lifecycle hooks (before, after, shutdown)
 * Allows registering callbacks at different stages of application lifecycle
 */

const Logger = require('@core/logger.core')

class Hooks {
    /**
     * Hooks storage
     * Organized by lifecycle stages
     * @static
     */
    static hooks = {
        before: [], // Runs before app initialization
        after: [], // Runs after app starts
        shutdown: [], // Runs during graceful shutdown
    }

    /**
     * Run all hooks for a specific lifecycle
     * @param {string} lifecycle - Lifecycle name (before, after, shutdown)
     * @returns {Promise<void>}
     * @static
     */
    static async run(lifecycle) {
        Logger.info('hooks', `Running ${lifecycle} hooks...`)

        // Get hooks for this lifecycle
        const hooksToRun = this.hooks[lifecycle] || []

        // Execute each hook sequentially
        for (const hook of hooksToRun) {
            try {
                await hook()
            } catch (err) {
                Logger.set(err, 'hooks')
                // For critical lifecycles (before, shutdown), propagate the error
                if (lifecycle === 'before' || lifecycle === 'shutdown') {
                    throw new Error(`Critical hook failed in ${lifecycle}: ${err.message}`)
                }
                // For 'after' hooks, log but continue
                Logger.warn('hooks', `Hook failed in ${lifecycle}, continuing...`)
            }
        }

        Logger.info('hooks', `${lifecycle} hooks completed`)
    }

    /**
     * Register a new hook callback
     * @param {string} lifecycle - Lifecycle name (before, after, shutdown)
     * @param {Function} callback - Async function to execute
     * @static
     */
    static register(lifecycle, callback) {
        if (this.hooks[lifecycle]) {
            this.hooks[lifecycle].push(callback)
            Logger.debug('hooks', `Hook registered for ${lifecycle}`)
        } else {
            Logger.warn('hooks', `Unknown lifecycle: ${lifecycle}`)
        }
    }

    /**
     * Load application hooks from register file
     * @static
     * @private
     */
    static load() {
        try {
            require('@app/hooks/register.hook').register(this)
        } catch (err) {
            Logger.warn('hooks', 'No hooks registered or failed to load')
        }
    }
}

// Auto-load hooks on module initialization
Hooks.load()

module.exports = Hooks
