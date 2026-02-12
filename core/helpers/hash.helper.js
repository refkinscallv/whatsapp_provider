'use strict'

/**
 * Hash Helper
 * Provides hashing and encryption utilities
 */

const bcrypt = require('bcrypt')
const crypto = require('crypto')
const md5 = require('md5')

module.exports = class Hash {
    /**
     * Hash a value using bcrypt
     * @param {string} value - Value to hash
     * @param {number} rounds - Salt rounds (default: 10)
     * @returns {Promise<string>}
     */
    static async make(value, rounds = 10) {
        return await bcrypt.hash(value, rounds)
    }

    /**
     * Check if value matches hash
     * @param {string} value - Plain value
     * @param {string} hash - Hashed value
     * @returns {Promise<boolean>}
     */
    static async check(value, hash) {
        return await bcrypt.compare(value, hash)
    }

    /**
     * Generate MD5 hash
     * @param {string} value - Value to hash
     * @returns {string}
     */
    static md5(value) {
        return md5(value)
    }

    /**
     * Generate SHA256 hash
     * @param {string} value - Value to hash
     * @returns {string}
     */
    static sha256(value) {
        return crypto.createHash('sha256').update(value).digest('hex')
    }

    /**
     * Generate SHA512 hash
     * @param {string} value - Value to hash
     * @returns {string}
     */
    static sha512(value) {
        return crypto.createHash('sha512').update(value).digest('hex')
    }

    /**
     * Generate random string
     * @param {number} length - Length of string
     * @returns {string}
     */
    static random(length = 32) {
        return crypto.randomBytes(length).toString('hex')
    }

    /**
     * Generate UUID v4
     * @returns {string}
     */
    static uuid() {
        const { v4: uuidv4 } = require('uuid')
        return uuidv4()
    }

    /**
     * Generate 32-character MD5 token
     * @returns {string}
     */
    static token() {
        return md5(crypto.randomBytes(32).toString('hex'))
    }

    /**
     * Generate unique ID
     * @param {string} prefix - Optional prefix
     * @returns {string}
     */
    static uniqueId(prefix = '') {
        const uniqid = require('uniqid')
        return uniqid(prefix)
    }
}
