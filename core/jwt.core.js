'use strict'

const jwt = require('jsonwebtoken')
const config = require('@app/config')
const Logger = require('@core/logger.core')

module.exports = class JWT {
    static sign(payload, expiresIn = config.jwt.expiresIn) {
        try {
            return jwt.sign(payload, config.jwt.secret, { expiresIn })
        } catch (err) {
            Logger.set(err, 'jwt')
            throw err
        }
    }

    static verify(token) {
        try {
            return jwt.verify(token, config.jwt.secret)
        } catch (err) {
            Logger.set(err, 'jwt')
            return null
        }
    }

    static decode(token) {
        try {
            return jwt.decode(token)
        } catch (err) {
            Logger.set(err, 'jwt')
            return null
        }
    }
}
