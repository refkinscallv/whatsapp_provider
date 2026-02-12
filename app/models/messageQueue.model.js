'use strict'

module.exports = (sequelize, DataTypes) => {
    const MessageQueue = sequelize.define(
        'MessageQueue',
        {
            id: {
                type: DataTypes.BIGINT.UNSIGNED,
                primaryKey: true,
                autoIncrement: true,
            },

            token: {
                type: DataTypes.STRING(32),
                allowNull: false,
                unique: true,
            },

            device_token: {
                type: DataTypes.STRING(32),
                allowNull: false,
            },

            user_token: {
                type: DataTypes.STRING(32),
                allowNull: false,
            },

            priority: {
                type: DataTypes.ENUM('high', 'normal', 'low'),
                allowNull: false,
                defaultValue: 'normal',
                comment: 'high=premium, normal=standard, low=free',
            },

            to: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            message: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            type: {
                type: DataTypes.ENUM('text', 'image', 'video', 'audio', 'document', 'location', 'contact', 'sticker'),
                allowNull: false,
                defaultValue: 'text',
            },

            media_url: {
                type: DataTypes.STRING(500),
                allowNull: true,
            },

            metadata: {
                type: DataTypes.JSON,
                allowNull: true,
            },

            status: {
                type: DataTypes.ENUM('queued', 'processing', 'completed', 'failed'),
                allowNull: false,
                defaultValue: 'queued',
            },

            scheduled_at: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'When to send the message',
            },

            attempts: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },

            max_attempts: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 3,
            },

            error_message: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            processed_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'message_queue',
            timestamps: true,
            indexes: [
                {
                    fields: ['device_token'],
                    name: 'idx_msg_queue_device',
                },
                {
                    fields: ['user_token'],
                    name: 'idx_msg_queue_user',
                },
                {
                    fields: ['priority'],
                    name: 'idx_msg_queue_priority',
                },
                {
                    fields: ['status'],
                    name: 'idx_msg_queue_status',
                },
                {
                    fields: ['scheduled_at'],
                    name: 'idx_msg_queue_scheduled',
                },
            ],
        },
    )

    MessageQueue.associate = (models) => {
        MessageQueue.belongsTo(models.Device, {
            foreignKey: 'device_token',
            targetKey: 'token',
            as: 'device',
            onDelete: 'CASCADE',
        })

        MessageQueue.belongsTo(models.User, {
            foreignKey: 'user_token',
            targetKey: 'token',
            as: 'user',
            onDelete: 'CASCADE',
        })
    }

    return MessageQueue
}
