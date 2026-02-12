'use strict'

module.exports = (sequelize, DataTypes) => {
    const AutoReplyRule = sequelize.define(
        'AutoReplyRule',
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

            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },

            trigger_type: {
                type: DataTypes.ENUM('exact', 'contains', 'starts_with', 'ends_with', 'regex'),
                allowNull: false,
                defaultValue: 'contains',
            },

            trigger_pattern: {
                type: DataTypes.STRING(500),
                allowNull: false,
            },

            reply_message: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            reply_delay: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Delay in milliseconds before sending reply',
            },

            priority: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Higher priority rules are checked first',
            },

            conditions: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Additional conditions (time, sender, etc.)',
            },

            usage_count: {
                type: DataTypes.BIGINT.UNSIGNED,
                allowNull: false,
                defaultValue: 0,
            },

            last_triggered_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'auto_reply_rules',
            timestamps: true,
            indexes: [
                {
                    fields: ['is_active'],
                    name: 'idx_auto_reply_active',
                },
                {
                    fields: ['priority'],
                    name: 'idx_auto_reply_priority',
                },
            ],
        },
    )

    AutoReplyRule.associate = (models) => {
        AutoReplyRule.belongsTo(models.Device, {
            foreignKey: 'device_token',
            targetKey: 'token',
            as: 'device',
            onDelete: 'CASCADE',
        })

        AutoReplyRule.belongsTo(models.User, {
            foreignKey: 'user_token',
            targetKey: 'token',
            as: 'user',
            onDelete: 'SET NULL',
        })
    }

    return AutoReplyRule
}
