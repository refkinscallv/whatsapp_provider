'use strict'

module.exports = (sequelize, DataTypes) => {
    const AiSession = sequelize.define(
        'AiSession',
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

            ai_model: {
                type: DataTypes.ENUM('chatgpt', 'gemini'),
                allowNull: false,
                defaultValue: 'chatgpt',
                comment: 'AI provider model',
            },

            language: {
                type: DataTypes.STRING(10),
                allowNull: false,
                defaultValue: 'id',
                comment: 'Response language (e.g. id, en)',
            },

            status: {
                type: DataTypes.ENUM('active', 'inactive'),
                allowNull: false,
                defaultValue: 'active',
                comment: 'Auto-reply status',
            },

            is_deleted: {
                type: DataTypes.TINYINT(1),
                allowNull: false,
                defaultValue: 0,
            },
        },
        {
            tableName: 'ai_sessions',
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    fields: ['device_token'],
                    name: 'idx_ai_session_device',
                },
                {
                    fields: ['user_token'],
                    name: 'idx_ai_session_user',
                },
                {
                    fields: ['status'],
                    name: 'idx_ai_session_status',
                },
            ],
        },
    )

    AiSession.associate = (models) => {
        AiSession.belongsTo(models.Device, {
            foreignKey: 'device_token',
            targetKey: 'token',
            as: 'device',
            onDelete: 'CASCADE',
        })

        AiSession.belongsTo(models.User, {
            foreignKey: 'user_token',
            targetKey: 'token',
            as: 'user',
            onDelete: 'CASCADE',
        })

        AiSession.hasMany(models.AiKnowledge, {
            foreignKey: 'ai_session_id',
            as: 'knowledge',
        })

        AiSession.hasMany(models.AiConversation, {
            foreignKey: 'ai_session_id',
            as: 'conversations',
        })
    }

    return AiSession
}
