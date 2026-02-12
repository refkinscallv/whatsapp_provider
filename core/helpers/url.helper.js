'use strict'

/**
 * URL Helper
 * Provides utilities for URL generation and manipulation
 */

const config = require('@app/config')

module.exports = class Url {
    /**
     * Generate full URL from path
     * @param {string} path - URL path
     * @returns {string}
     */
    static to(path = '') {
        const baseUrl = config.app.url.replace(/\/$/, '')
        const cleanPath = path.replace(/^\//, '')
        return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl
    }

    /**
     * Generate asset URL
     * @param {string} path - Asset path
     * @returns {string}
     */
    static asset(path) {
        return this.to(`static/${path}`)
    }

    /**
     * Generate API URL
     * @param {string} path - API path
     * @returns {string}
     */
    static api(path = '') {
        return this.to(`api/${path}`)
    }

    /**
     * Build URL with query parameters
     * @param {string} path - Base path
     * @param {Object} params - Query parameters
     * @returns {string}
     */
    static withQuery(path, params = {}) {
        const url = this.to(path)
        const queryString = new URLSearchParams(params).toString()
        return queryString ? `${url}?${queryString}` : url
    }

    /**
     * Parse URL and return components
     * @param {string} url - URL to parse
     * @returns {Object}
     */
    static parse(url) {
        try {
            const parsed = new URL(url)
            return {
                protocol: parsed.protocol,
                host: parsed.host,
                hostname: parsed.hostname,
                port: parsed.port,
                pathname: parsed.pathname,
                search: parsed.search,
                hash: parsed.hash,
                query: Object.fromEntries(parsed.searchParams),
            }
        } catch (err) {
            return null
        }
    }

    /**
     * Check if URL is valid
     * @param {string} url - URL to validate
     * @returns {boolean}
     */
    static isValid(url) {
        try {
            new URL(url)
            return true
        } catch {
            return false
        }
    }

    /**
     * Get current app URL
     * @returns {string}
     */
    static current() {
        return config.app.url
    }
}
