'use strict'

module.exports = (sequelize, DataTypes) => {
    const MessageHistory = sequelize.define(
        'MessageHistory',
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
                allowNull: true,
            },

            message_id: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: 'WhatsApp message ID',
            },

            to: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'Recipient phone number',
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

            status: {
                type: DataTypes.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
                allowNull: false,
                defaultValue: 'pending',
            },

            media_url: {
                type: DataTypes.STRING(500),
                allowNull: true,
            },

            metadata: {
                type: DataTypes.JSON,
                allowNull: true,
            },

            error_message: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            sent_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            delivered_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            read_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'message_history',
            timestamps: true,
            indexes: [
                {
                    fields: ['message_id'],
                    name: 'idx_msg_history_msg_id',
                },
                {
                    fields: ['status'],
                    name: 'idx_msg_history_status',
                },
                {
                    fields: ['type'],
                    name: 'idx_msg_history_type',
                },
                {
                    fields: ['to'],
                    name: 'idx_msg_history_to',
                },
            ],
        },
    )

    MessageHistory.associate = (models) => {
        MessageHistory.belongsTo(models.Device, {
            foreignKey: 'device_token',
            targetKey: 'token',
            as: 'device',
            onDelete: 'CASCADE',
        })

        MessageHistory.belongsTo(models.User, {
            foreignKey: 'user_token',
            targetKey: 'token',
            as: 'user',
            onDelete: 'SET NULL',
        })
    }

    return MessageHistory
}
