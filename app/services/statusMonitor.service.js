'use strict'

const os = require('os')
const db = require('@core/database.core')
const Socket = require('@core/socket.core')
const Logger = require('@core/logger.core')
const whatsappService = require('./whatsapp.service')

/**
 * Status Monitor Service
 * Periodically checks system health and broadcasts to sockets
 */
class StatusMonitorService {
    constructor() {
        this.interval = null
        this.CHECK_INTERVAL = 10000 // 10 seconds
    }

    /**
     * Start monitoring
     */
    start() {
        if (this.interval) return

        Logger.info('monitor', 'Starting system status monitor...')
        this.interval = setInterval(() => this.checkStatus(), this.CHECK_INTERVAL)

        // Initial check
        this.checkStatus()
    }

    /**
     * Stop monitoring
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
        }
    }

    /**
     * Perform status checks and broadcast results
     */
    async checkStatus() {
        const io = Socket.getInstance()
        if (!io) return

        try {
            // 1. Global System Stats (Admin Only)
            const systemStats = {
                cpu: {
                    load: os.loadavg(),
                    usage: this.getCPUUsage()
                },
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    usage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
                },
                uptime: os.uptime(),
                db: await this.checkDatabase(),
                whatsapp: {
                    total: whatsappService.init.clients.size,
                    ready: Array.from(whatsappService.init.clientStates.values()).filter(s => s === 'ready').length
                },
                timestamp: new Date()
            }

            io.to('admin').emit('system:status', systemStats)

            // 2. User-Specific Stats
            await this.broadcastUserStats(io)

        } catch (err) {
            Logger.error('monitor', `Error during status check: ${err.message}`)
        }
    }

    /**
     * Check database connection
     */
    async checkDatabase() {
        try {
            await db.sequelize.authenticate()
            return 'connected'
        } catch (err) {
            return 'disconnected'
        }
    }

    /**
     * Get CPU usage percentage (simple estimate)
     */
    getCPUUsage() {
        const cpus = os.cpus()
        let totalIdle = 0, totalTick = 0
        cpus.forEach(cpu => {
            for (let type in cpu.times) {
                totalTick += cpu.times[type]
            }
            totalIdle += cpu.times.idle
        })
        return (100 - (100 * totalIdle / totalTick)).toFixed(2)
    }

    /**
     * Broadcast user-specific statistics
     */
    async broadcastUserStats(io) {
        try {
            // Get active users from sockets or database
            // For efficiency, we can query users who have active devices or simply all users with active socket rooms
            // In a production app, we might want to only target connected users

            // Get all rooms starting with 'user:'
            const userRooms = Array.from(io.sockets.adapter.rooms.keys())
                .filter(room => room.startsWith('user:'))

            for (const room of userRooms) {
                const userToken = room.split(':')[1]

                // Fetch stats for this specific user
                const stats = await this.getUserStats(userToken)
                io.to(room).emit('user:status', stats)
            }
        } catch (err) {
            Logger.debug('monitor', `Failed to broadcast user stats: ${err.message}`)
        }
    }

    /**
     * Get statistics for a specific user
     */
    async getUserStats(userToken) {
        try {
            const userDevices = await db.models.UserDevice.findAll({
                where: { user_token: userToken },
                attributes: ['device_token']
            })
            const deviceTokens = userDevices.map(ud => ud.device_token)

            const activeDevices = deviceTokens.filter(token =>
                whatsappService.isClientReady(token)
            ).length

            // Message counts (today)
            const startOfDay = new Date()
            startOfDay.setHours(0, 0, 0, 0)

            const messageCount = await db.models.MessageHistory.count({
                where: {
                    device_token: deviceTokens,
                    createdAt: { [db.Sequelize.Op.gte]: startOfDay }
                }
            })

            return {
                devices: {
                    total: deviceTokens.length,
                    active: activeDevices
                },
                messages: {
                    today: messageCount
                },
                timestamp: new Date()
            }
        } catch (err) {
            return { error: err.message }
        }
    }
}

module.exports = new StatusMonitorService()
