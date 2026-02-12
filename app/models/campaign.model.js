'use strict'

module.exports = (sequelize, DataTypes) => {
    const Campaign = sequelize.define(
        'Campaign',
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

            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: true,
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

            target_audience: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Array of phone numbers or contact book tokens',
            },

            status: {
                type: DataTypes.ENUM('draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled'),
                allowNull: false,
                defaultValue: 'draft',
            },

            scheduled_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            started_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            completed_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            total_recipients: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },

            sent_count: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },

            failed_count: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },

            settings: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Campaign settings (delay between messages, etc.)',
            },
        },
        {
            tableName: 'campaigns',
            timestamps: true,
            indexes: [
                {
                    fields: ['device_token'],
                    name: 'idx_campaign_device',
                },
                {
                    fields: ['user_token'],
                    name: 'idx_campaign_user',
                },
                {
                    fields: ['status'],
                    name: 'idx_campaign_status',
                },
                {
                    fields: ['scheduled_at'],
                    name: 'idx_campaign_scheduled',
                },
            ],
        },
    )

    Campaign.associate = (models) => {
        Campaign.belongsTo(models.Device, {
            foreignKey: 'device_token',
            targetKey: 'token',
            as: 'device',
            onDelete: 'CASCADE',
        })

        Campaign.belongsTo(models.User, {
            foreignKey: 'user_token',
            targetKey: 'token',
            as: 'user',
            onDelete: 'CASCADE',
        })

        Campaign.hasMany(models.ScheduledMessage, {
            foreignKey: 'campaign_token',
            sourceKey: 'token',
            as: 'scheduledMessages',
        })
    }

    return Campaign
}
