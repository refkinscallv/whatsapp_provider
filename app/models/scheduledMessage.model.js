'use strict'

module.exports = (sequelize, DataTypes) => {
    const ScheduledMessage = sequelize.define(
        'ScheduledMessage',
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

            campaign_token: {
                type: DataTypes.STRING(32),
                allowNull: true,
                comment: 'Link to campaign if part of one',
            },

            to: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            message: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            type: {
                type: DataTypes.ENUM('text', 'image', 'video', 'audio', 'document'),
                allowNull: false,
                defaultValue: 'text',
            },

            media_url: {
                type: DataTypes.STRING(500),
                allowNull: true,
            },

            scheduled_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },

            status: {
                type: DataTypes.ENUM('pending', 'sent', 'failed', 'cancelled'),
                allowNull: false,
                defaultValue: 'pending',
            },

            target_type: {
                type: DataTypes.ENUM('single', 'book'),
                allowNull: false,
                defaultValue: 'single',
            },

            target_id: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },

            sent_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            error_message: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            metadata: {
                type: DataTypes.JSON,
                allowNull: true,
            },

            is_recurring: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            recurrence_type: {
                type: DataTypes.ENUM('hourly', 'daily', 'weekly', 'monthly', 'yearly'),
                allowNull: true,
            },

            recurrence_end: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            recurrence_count: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                defaultValue: 0,
            },
        },
        {
            tableName: 'scheduled_messages',
            timestamps: true,
            indexes: [
                {
                    fields: ['device_token'],
                    name: 'idx_scheduled_msg_device',
                },
                {
                    fields: ['user_token'],
                    name: 'idx_scheduled_msg_user',
                },
                {
                    fields: ['campaign_token'],
                    name: 'idx_scheduled_msg_campaign',
                },
                {
                    fields: ['status'],
                    name: 'idx_scheduled_msg_status',
                },
                {
                    fields: ['scheduled_at'],
                    name: 'idx_scheduled_msg_scheduled',
                },
            ],
        },
    )

    ScheduledMessage.associate = (models) => {
        ScheduledMessage.belongsTo(models.Device, {
            foreignKey: 'device_token',
            targetKey: 'token',
            as: 'device',
            onDelete: 'CASCADE',
        })

        ScheduledMessage.belongsTo(models.User, {
            foreignKey: 'user_token',
            targetKey: 'token',
            as: 'user',
            onDelete: 'CASCADE',
        })

        ScheduledMessage.belongsTo(models.Campaign, {
            foreignKey: 'campaign_token',
            targetKey: 'token',
            as: 'campaign',
            onDelete: 'SET NULL',
        })
    }

    return ScheduledMessage
}
