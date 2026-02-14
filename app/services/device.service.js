'use strict'

const db = require('@core/database.core')
const whatsappService = require('./whatsapp.service')
const subscriptionService = require('./subscription.service')
const Hash = require('@core/helpers/hash.helper')
const Logger = require('@core/logger.core')

/**
 * Device Service
 * Manages WhatsApp devices and user-device associations
 */
class DeviceService {
    /**
     * Create a new device
     * @param {string} userToken - User token
     * @param {string} name - Device name
     * @param {boolean} isHost - Is user the host/owner
     * @returns {Promise<object>}
     */
    async createDevice(userToken, name, provider = 'wwebjs', isHost = true) {
        const deviceToken = Hash.token()

        // Create device record
        const device = await db.models.Device.create({
            token: deviceToken,
            name,
            provider,
            status: 'prepare',
            is_admin: false,
            is_auth: false,
            is_logged_out: false,
            is_deleted: false,
        })

        // Create user-device association
        await db.models.UserDevice.create({
            user_token: userToken,
            device_token: deviceToken,
            is_host: isHost,
        })

        // Decrement subscription usage
        await subscriptionService.decrementUsage(userToken, 'devices')

        Logger.info(`Device created: ${deviceToken} (${provider}) for user ${userToken}`)

        return {
            success: true,
            message: 'Device created successfully',
            device: {
                token: device.token,
                name: device.name,
                provider: device.provider,
                status: device.status,
                is_auth: device.is_auth,
            },
        }
    }

    /**
     * Initialize WhatsApp client for device
     * @param {string} deviceToken - Device token
     * @returns {Promise<object>}
     */
    async initializeDevice(deviceToken) {
        const device = await db.models.Device.findOne({
            where: { token: deviceToken },
        })

        if (!device) {
            throw new Error('Device not found')
        }

        if (device.is_logged_out) {
            throw new Error('Device is logged out. Please create a new device.')
        }

        try {
            // Create WhatsApp client with the stored provider
            await whatsappService.createClient(deviceToken, {
                provider: device.provider || 'wwebjs'
            })

            Logger.info(`WhatsApp client initialized for device ${deviceToken} using ${device.provider || 'wwebjs'}`)

            return {
                success: true,
                message: 'Device initialization started. Please scan QR code.',
                device: {
                    token: device.token,
                    name: device.name,
                    provider: device.provider,
                    status: device.status,
                },
            }
        } catch (err) {
            Logger.error(`Failed to initialize device ${deviceToken}`, err)
            throw new Error(`Failed to initialize device: ${err.message}`)
        }
    }

    /**
     * Get device by token
     * @param {string} deviceToken - Device token
     * @returns {Promise<object>}
     */
    async getDevice(deviceToken) {
        const device = await db.models.Device.findOne({
            where: { token: deviceToken },
            include: [
                {
                    model: db.models.User,
                    as: 'users',
                    through: {
                        attributes: ['is_host'],
                    },
                    attributes: ['token', 'name', 'email'],
                },
            ],
        })

        if (!device) {
            throw new Error('Device not found')
        }

        // Get client info if available
        const clientInfo = whatsappService.getClientInfo(deviceToken)

        return {
            ...device.toJSON(),
            clientInfo,
        }
    }

    /**
     * Get all devices for user
     * @param {string} userToken - User token
     * @returns {Promise<Array>}
     */
    async getUserDevices(userToken) {
        const devices = await db.models.Device.findAll({
            include: [
                {
                    model: db.models.User,
                    as: 'users',
                    attributes: ['token', 'name', 'email'],
                    through: {
                        attributes: ['is_host'],
                    },
                }
            ],
            where: {
                '$users.token$': userToken
            },
            order: [['createdAt', 'DESC']],
        })

        // Add client info for each device
        return devices.map((device) => {
            const clientInfo = whatsappService.getClientInfo(device.token)
            return {
                ...device.toJSON(),
                clientInfo,
            }
        })
    }

    /**
     * Delete device
     * @param {string} deviceToken - Device token
     * @param {string} userToken - User token (for authorization)
     * @returns {Promise<object>}
     */
    async deleteDevice(deviceToken, userToken) {
        const device = await db.models.Device.findOne({
            where: { token: deviceToken },
            include: [
                {
                    model: db.models.User,
                    as: 'users',
                    where: { token: userToken },
                    through: {
                        where: { is_host: true },
                    },
                },
            ],
        })

        if (!device) {
            throw new Error('Device not found or you are not the host')
        }

        // Destroy WhatsApp client and delete session
        await whatsappService.destroyClient(deviceToken, true)

        // Soft delete device
        await device.update({
            is_deleted: true,
            deleted_at: new Date(),
        })

        await device.destroy() // Soft delete

        Logger.info(`Device deleted: ${deviceToken}`)

        return {
            success: true,
            message: 'Device deleted successfully',
        }
    }

    /**
     * Logout device
     * @param {string} deviceToken - Device token
     * @param {string} userToken - User token (for authorization)
     * @returns {Promise<object>}
     */
    async logoutDevice(deviceToken, userToken) {
        const device = await db.models.Device.findOne({
            where: { token: deviceToken },
            include: [
                {
                    model: db.models.User,
                    as: 'users',
                    where: { token: userToken },
                },
            ],
        })

        if (!device) {
            throw new Error('Device not found or unauthorized')
        }

        // Logout WhatsApp client
        await whatsappService.logout(deviceToken)

        Logger.info(`Device logged out: ${deviceToken}`)

        return {
            success: true,
            message: 'Device logged out successfully',
        }
    }

    /**
     * Get device QR code
     * @param {string} deviceToken - Device token
     * @returns {Promise<object>}
     */
    async getDeviceQR(deviceToken) {
        const device = await db.models.Device.findOne({
            where: { token: deviceToken },
        })

        if (!device) {
            throw new Error('Device not found')
        }

        return {
            success: true,
            qr: device.qr,
            status: device.status,
        }
    }

    /**
     * Invite a user to manage a device
     * @param {string} deviceToken - Device token
     * @param {string} hostToken - Token of the host user
     * @param {string} inviteeIdentifier - Email or WhatsApp of the user to invite
     * @returns {Promise<object>}
     */
    async inviteUserToDevice(deviceToken, hostToken, inviteeIdentifier) {
        // 1. Verify host and device
        const hostLink = await db.models.UserDevice.findOne({
            where: { device_token: deviceToken, user_token: hostToken, is_host: true }
        })

        if (!hostLink) {
            throw new Error('Unauthorized: Only device hosts can invite users')
        }

        // 2. Find invitee
        const invitee = await db.models.User.findOne({
            where: {
                [db.Op.or]: [{ email: inviteeIdentifier }, { whatsapp: inviteeIdentifier }]
            }
        })

        if (!invitee) {
            throw new Error('User not found. Please ensure they are registered first.')
        }

        // 3. Check if already invited
        const existingLink = await db.models.UserDevice.findOne({
            where: { device_token: deviceToken, user_token: invitee.token }
        })

        if (existingLink) {
            throw new Error('User already has access to this device')
        }

        // 4. Create association
        await db.models.UserDevice.create({
            device_token: deviceToken,
            user_token: invitee.token,
            is_host: false
        })

        Logger.info(`User ${invitee.token} invited to device ${deviceToken} by ${hostToken}`)

        return {
            success: true,
            message: `User ${invitee.name} has been granted access to this device`
        }
    }

    /**
     * Revoke user access from a device
     * @param {string} deviceToken - Device token
     * @param {string} hostToken - Token of the host user
     * @param {string} targetUserToken - Token of the user to remove
     * @returns {Promise<object>}
     */
    async removeUserFromDevice(deviceToken, hostToken, targetUserToken) {
        // 1. Verify host
        const hostLink = await db.models.UserDevice.findOne({
            where: { device_token: deviceToken, user_token: hostToken, is_host: true }
        })

        if (!hostLink) {
            throw new Error('Unauthorized: Only device hosts can manage access')
        }

        if (hostToken === targetUserToken) {
            throw new Error('Cannot remove yourself as host. Please delete the device instead.')
        }

        // 2. Remove link
        const removedCount = await db.models.UserDevice.destroy({
            where: { device_token: deviceToken, user_token: targetUserToken, is_host: false }
        })

        if (removedCount === 0) {
            throw new Error('User does not have access to this device or is a host')
        }

        return {
            success: true,
            message: 'User access revoked successfully'
        }
    }

    /**
     * Update device name
     * @param {string} deviceToken - Device token
     * @param {string} userToken - User token
     * @param {string} name - New name
     * @returns {Promise<object>}
     */
    async updateDeviceName(deviceToken, userToken, name) {
        const device = await db.models.Device.findOne({
            where: { token: deviceToken },
            include: [
                {
                    model: db.models.User,
                    as: 'users',
                    where: { token: userToken },
                    through: {
                        where: { is_host: true },
                    },
                },
            ],
        })

        if (!device) {
            throw new Error('Device not found or you are not the host')
        }

        await device.update({ name })

        return {
            success: true,
            message: 'Device name updated successfully',
            device: {
                token: device.token,
                name: device.name,
            },
        }
    }

    /**
     * Reconnect all active devices that were authenticated before restart
     * @returns {Promise<void>}
     */
    async reconnectActiveDevices() {
        try {
            const activeDevices = await db.models.Device.findAll({
                where: {
                    is_auth: true,
                    is_logged_out: false,
                    is_deleted: false
                }
            })

            if (activeDevices.length === 0) {
                Logger.info('No active devices to reconnect')
                return
            }

            Logger.info(`Found ${activeDevices.length} active devices to reconnect...`)

            for (const device of activeDevices) {
                try {
                    Logger.info(`Auto-reconnecting device: ${device.name} (${device.token})`)
                    await this.initializeDevice(device.token)
                    // Add a small delay between initializations to prevent CPU spikes
                    await new Promise(resolve => setTimeout(resolve, 2000))
                } catch (err) {
                    Logger.error(`Failed to auto-reconnect device ${device.token}`, err)
                }
            }
        } catch (err) {
            Logger.error('Error in reconnectActiveDevices', err)
        }
    }

    /**
     * Check if phone numbers are registered on WhatsApp
     * @param {string} deviceToken - Device token
     * @param {Array<string>} numbers - Array of phone numbers
     * @param {string} userToken - User token for persistence
     * @param {string} [customBatchId] - Optional custom batch ID
     * @returns {Promise<object>} Result with batch_id and results array
     */
    async checkNumbers(deviceToken, numbers, userToken, customBatchId = null) {
        const results = []
        const batchId = customBatchId || Hash.token() // Use custom or generate a unique batch ID

        for (let i = 0; i < numbers.length; i++) {
            const number = numbers[i].trim()
            if (!number) continue

            let result = {
                batch_id: batchId,
                user_token: userToken,
                device_token: deviceToken,
                number,
                exists: false,
                status: 'success'
            }

            try {
                const isRegistered = await whatsappService.isRegisteredUser(deviceToken, number)
                result.exists = isRegistered
            } catch (err) {
                result.status = 'error'
                result.message = err.message
            }

            await db.models.NumberCheckResult.create(result)
            results.push(result)

            // Small delay between checks for bulk to avoid overloading
            if (numbers.length > 1 && i < numbers.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500))
            }
        }

        return {
            batch_id: batchId,
            results
        }
    }
}

module.exports = new DeviceService()
