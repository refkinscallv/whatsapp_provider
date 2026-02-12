'use strict'

module.exports = (sequelize, DataTypes) => {
    const MessageTemplate = sequelize.define(
        'MessageTemplate',
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
                allowNull: true,
            },

            device_token: {
                type: DataTypes.STRING(32),
                allowNull: true,
            },

            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            category: {
                type: DataTypes.STRING,
                allowNull: true,
            },

            content: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            variables: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Array of variable names used in template',
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

            usage_count: {
                type: DataTypes.BIGINT.UNSIGNED,
                allowNull: false,
                defaultValue: 0,
            },

            last_used_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'message_templates',
            timestamps: true,
            indexes: [
                {
                    fields: ['user_token'],
                    name: 'idx_template_user',
                },
                {
                    fields: ['device_token'],
                    name: 'idx_template_device',
                },
                {
                    fields: ['category'],
                    name: 'idx_template_category',
                },
                {
                    fields: ['type'],
                    name: 'idx_template_type',
                },
            ],
        },
    )

    MessageTemplate.associate = (models) => {
        MessageTemplate.belongsTo(models.User, {
            foreignKey: 'user_token',
            targetKey: 'token',
            as: 'user',
            onDelete: 'CASCADE',
        })

        MessageTemplate.belongsTo(models.Device, {
            foreignKey: 'device_token',
            targetKey: 'token',
            as: 'device',
            onDelete: 'SET NULL',
        })
    }

    return MessageTemplate
}
