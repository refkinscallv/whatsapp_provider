'use strict'

/**
 * String Helper
 * Provides string manipulation utilities
 */

module.exports = class Str {
    /**
     * Convert string to camelCase
     * @param {string} str - Input string
     * @returns {string}
     */
    static camelCase(str) {
        return str
            .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
                return index === 0 ? word.toLowerCase() : word.toUpperCase()
            })
            .replace(/\s+/g, '')
    }

    /**
     * Convert string to snake_case
     * @param {string} str - Input string
     * @returns {string}
     */
    static snakeCase(str) {
        return str
            .replace(/\W+/g, ' ')
            .split(/ |\B(?=[A-Z])/)
            .map((word) => word.toLowerCase())
            .join('_')
    }

    /**
     * Convert string to kebab-case
     * @param {string} str - Input string
     * @returns {string}
     */
    static kebabCase(str) {
        return str
            .replace(/\W+/g, ' ')
            .split(/ |\B(?=[A-Z])/)
            .map((word) => word.toLowerCase())
            .join('-')
    }

    /**
     * Convert string to Title Case
     * @param {string} str - Input string
     * @returns {string}
     */
    static titleCase(str) {
        return str.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        })
    }

    /**
     * Truncate string to specified length
     * @param {string} str - Input string
     * @param {number} length - Max length
     * @param {string} end - End string (default: '...')
     * @returns {string}
     */
    static truncate(str, length = 100, end = '...') {
        if (str.length <= length) return str
        return str.substring(0, length - end.length) + end
    }

    /**
     * Generate random string
     * @param {number} length - Length of string
     * @returns {string}
     */
    static random(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let result = ''
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }

    /**
     * Slugify string
     * @param {string} str - Input string
     * @returns {string}
     */
    static slug(str) {
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '')
    }

    /**
     * Check if string contains substring
     * @param {string} str - Input string
     * @param {string} search - Search string
     * @returns {boolean}
     */
    static contains(str, search) {
        return str.includes(search)
    }

    /**
     * Check if string starts with substring
     * @param {string} str - Input string
     * @param {string} search - Search string
     * @returns {boolean}
     */
    static startsWith(str, search) {
        return str.startsWith(search)
    }

    /**
     * Check if string ends with substring
     * @param {string} str - Input string
     * @param {string} search - Search string
     * @returns {boolean}
     */
    static endsWith(str, search) {
        return str.endsWith(search)
    }

    /**
     * Capitalize first letter
     * @param {string} str - Input string
     * @returns {string}
     */
    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1)
    }

    /**
     * Reverse string
     * @param {string} str - Input string
     * @returns {string}
     */
    static reverse(str) {
        return str.split('').reverse().join('')
    }

    /**
     * Repeat string n times
     * @param {string} str - Input string
     * @param {number} times - Number of times to repeat
     * @returns {string}
     */
    static repeat(str, times) {
        return str.repeat(times)
    }
}
