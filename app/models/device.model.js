'use strict'

module.exports = (sequelize, DataTypes) => {
    const Device = sequelize.define(
        'Device',
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

            status: {
                type: DataTypes.ENUM(
                    // Application States
                    'prepare', 'initializing', 'qr', 'ready', 'authenticated', 'auth_failure', 'disconnected', 'unknown',
                    // WhatsApp WAState (Strings from Constants.js)
                    'CONFLICT', 'CONNECTED', 'DEPRECATED_VERSION', 'OPENING', 'PAIRING', 'PROXYBLOCK',
                    'SMB_TOS_BLOCK', 'TIMEOUT', 'TOS_BLOCK', 'UNLAUNCHED', 'UNPAIRED', 'UNPAIRED_IDLE'
                ),
                allowNull: true,
                defaultValue: 'prepare',
            },

            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            is_admin: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            is_auth: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            is_logged_out: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            is_deleted: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            qr: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            data: {
                type: DataTypes.JSON,
                allowNull: true,
            },

            provider: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'wwebjs',
            },

            authenticated_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            logged_out_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            deleted_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'devices',
            timestamps: true,
            paranoid: true,
            deletedAt: 'deleted_at',
            indexes: [
                {
                    fields: ['is_deleted', 'is_logged_out', 'status'],
                    name: 'idx_device_status',
                },
                {
                    fields: ['status'],
                    name: 'idx_device_status_single',
                },
            ],
        },
    )

    Device.associate = (models) => {
        Device.belongsToMany(models.User, {
            through: models.UserDevice,
            foreignKey: 'device_token',
            otherKey: 'user_token',
            sourceKey: 'token',
            targetKey: 'token',
            as: 'users',
        })

        Device.hasMany(models.MessageHistory, {
            foreignKey: 'device_token',
            sourceKey: 'token',
            as: 'messageHistory',
        })

        Device.hasMany(models.Contact, {
            foreignKey: 'device_token',
            sourceKey: 'token',
            as: 'contacts',
        })

        Device.hasMany(models.AutoReplyRule, {
            foreignKey: 'device_token',
            sourceKey: 'token',
            as: 'autoReplyRules',
        })

        Device.hasMany(models.MessageTemplate, {
            foreignKey: 'device_token',
            sourceKey: 'token',
            as: 'templates',
        })

        Device.hasMany(models.Webhook, {
            foreignKey: 'device_token',
            sourceKey: 'token',
            as: 'webhooks',
            onDelete: 'SET NULL',
        })
    }

    return Device
}
