'use strict'

module.exports = (sequelize, DataTypes) => {
    const Webhook = sequelize.define(
        'Webhook',
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

            user_token: {
                type: DataTypes.STRING(32),
                allowNull: false,
            },

            device_token: {
                type: DataTypes.STRING(32),
                allowNull: true,
            },

            url: {
                type: DataTypes.STRING(500),
                allowNull: false,
            },

            events: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Array of event types to listen for',
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },

            secret: {
                type: DataTypes.STRING(64),
                allowNull: true,
                comment: 'Secret for webhook signature verification',
            },

            retry_count: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 3,
            },

            last_triggered_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            last_status: {
                type: DataTypes.STRING,
                allowNull: true,
            },
        },
        {
            tableName: 'webhooks',
            timestamps: true,
            indexes: [
                {
                    fields: ['device_token'],
                    name: 'idx_webhook_device',
                },
                {
                    fields: ['user_token'],
                    name: 'idx_webhook_user',
                },
                {
                    fields: ['is_active'],
                    name: 'idx_webhook_active',
                },
            ],
        },
    )

    Webhook.associate = (models) => {
        Webhook.belongsTo(models.User, {
            foreignKey: 'user_token',
            targetKey: 'token',
            as: 'user',
            onDelete: 'CASCADE',
        })

        Webhook.belongsTo(models.Device, {
            foreignKey: 'device_token',
            targetKey: 'token',
            as: 'device',
            onDelete: 'SET NULL',
        })
    }

    return Webhook
}
