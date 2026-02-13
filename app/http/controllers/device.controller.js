'use strict'

const deviceService = require('@app/services/device.service')
const db = require('@core/database.core')

/**
 * Device Controller
 * Handles WhatsApp device management
 */
class DeviceController {
    /**
     * Create a new device
     * POST /api/devices
     */
    async create({ req, res }) {
        try {
            const { name, provider } = req.body

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Device name is required',
                })
            }

            const result = await deviceService.createDevice(req.user.token, name, provider || 'wwebjs', true)

            return res.status(201).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Initialize device (start WhatsApp client)
     * POST /api/devices/:token/initialize
     */
    async initialize({ req, res }) {
        try {
            const { token } = req.params

            // Security: Check if user owns the device
            const deviceCheck = await db.models.UserDevice.findOne({
                where: { user_token: req.user.token, device_token: token }
            })
            if (!deviceCheck) {
                return res.status(403).json({ success: false, message: 'Unauthorized access to this device' })
            }

            const result = await deviceService.initializeDevice(token)

            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Get device details
     * GET /api/devices/:token
     */
    async getDevice({ req, res }) {
        try {
            const { token } = req.params

            // Security: Check if user owns the device
            const deviceCheck = await db.models.UserDevice.findOne({
                where: { user_token: req.user.token, device_token: token }
            })
            if (!deviceCheck) {
                return res.status(403).json({ success: false, message: 'Unauthorized access to this device' })
            }

            const device = await deviceService.getDevice(token)

            return res.status(200).json({
                success: true,
                device,
            })
        } catch (err) {
            return res.status(404).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Get all devices for current user
     * GET /api/devices
     */
    async getUserDevices({ req, res }) {
        try {
            const devices = await deviceService.getUserDevices(req.user.token)

            return res.status(200).json({
                success: true,
                devices,
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Get device QR code
     * GET /api/devices/:token/qr
     */
    async getQR({ req, res }) {
        try {
            const { token } = req.params

            // Security: Check if user owns the device
            const deviceCheck = await db.models.UserDevice.findOne({
                where: { user_token: req.user.token, device_token: token }
            })
            if (!deviceCheck) {
                return res.status(403).json({ success: false, message: 'Unauthorized access to this device' })
            }

            const result = await deviceService.getDeviceQR(token)

            return res.status(200).json(result)
        } catch (err) {
            return res.status(404).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Update device name
     * PUT /api/devices/:token
     */
    async updateName({ req, res }) {
        try {
            const { token } = req.params
            const { name } = req.body

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Device name is required',
                })
            }

            const result = await deviceService.updateDeviceName(token, req.user.token, name)

            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Logout device
     * POST /api/devices/:token/logout
     */
    async logout({ req, res }) {
        try {
            const { token } = req.params

            const result = await deviceService.logoutDevice(token, req.user.token)

            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Delete device
     * DELETE /api/devices/:token
     */
    async delete({ req, res }) {
        try {
            const { token } = req.params

            const result = await deviceService.deleteDevice(token, req.user.token)

            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message,
            })
        }
    }

    /**
     * Invite user to device
     * POST /api/devices/:token/invite
     */
    async invite({ req, res }) {
        try {
            const { token } = req.params
            const { identifier } = req.body

            if (!identifier) {
                return res.status(400).json({ success: false, message: 'Email or WhatsApp number is required' })
            }

            const result = await deviceService.inviteUserToDevice(token, req.user.token, identifier)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Revoke user access
     * DELETE /api/devices/:token/users/:userToken
     */
    async revoke({ req, res }) {
        try {
            const { token, userToken } = req.params

            const result = await deviceService.removeUserFromDevice(token, req.user.token, userToken)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Check numbers status (Registered or not)
     * POST /api/devices/:token/check
     */
    async checkNumbers({ req, res }) {
        try {
            const { token } = req.params
            const { numbers, batch_id } = req.body
            if (!numbers) {
                return res.status(400).json({ success: false, message: 'Numbers are required' })
            }

            const numberList = Array.isArray(numbers) ? numbers : numbers.split(',').map(n => n.trim())

            // Check if device belongs to user (Security)
            const deviceOwnership = await db.models.UserDevice.findOne({
                where: { device_token: token, user_token: req.user.token }
            })
            if (!deviceOwnership) {
                return res.status(403).json({ success: false, message: 'Unauthorized access to this device' })
            }

            const results = await deviceService.checkNumbers(token, numberList, req.user.token, batch_id)

            return res.status(200).json({
                success: true,
                ...results
            })
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message,
            })
        }
    }
}

module.exports = DeviceController
