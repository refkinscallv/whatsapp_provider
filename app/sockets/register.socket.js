'use strict'

const Logger = require('@core/logger.core')

module.exports = {
    register(io) {
        Logger.info('socket', 'Registering socket handlers...')

        io.on('connection', async (socket) => {
            const clientId = socket.handshake.query.clientId
            const userToken = socket.handshake.query.userToken

            Logger.debug('socket', `New connection: ${socket.id}`)

            if (clientId) {
                socket.join(`client:${clientId}`)
                Logger.info('socket', `Client joined room: client:${clientId}`)
            }

            if (userToken) {
                try {
                    const db = require('@core/database.core')
                    const user = await db.models.User.findOne({ where: { token: userToken } })

                    if (user) {
                        socket.join(`user:${userToken}`)
                        Logger.info('socket', `User ${user.email} joined room: user:${userToken}`)

                        if (user.role === 'SUPER_ADMIN') {
                            socket.join('admin')
                            Logger.info('socket', `User ${user.email} joined room: admin`)
                        }
                    } else {
                        Logger.warn('socket', `Connection rejected: Invalid user token ${userToken}`)
                        socket.disconnect()
                        return
                    }
                } catch (err) {
                    Logger.error('socket', `Error during socket authentication: ${err.message}`)
                }
            }

            socket.on('join_room', (room) => {
                if (room.startsWith('device_')) {
                    socket.join(room)
                    Logger.info('socket', `Socket ${socket.id} joined room: ${room}`)
                }
            })

            socket.on('disconnect', () => {
                Logger.info('socket', `Socket disconnected: ${socket.id}`)
            })
        })

        Logger.info('socket', 'Socket handlers registered successfully')
    },
}
