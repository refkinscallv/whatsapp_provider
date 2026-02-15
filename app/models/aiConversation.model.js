'use strict'

module.exports = (sequelize, DataTypes) => {
    const AiConversation = sequelize.define(
        'AiConversation',
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

            ai_session_id: {
                type: DataTypes.BIGINT.UNSIGNED,
                allowNull: false,
            },

            device_token: {
                type: DataTypes.STRING(32),
                allowNull: false,
            },

            chat_id: {
                type: DataTypes.STRING(255),
                allowNull: false,
                comment: 'WhatsApp chat ID (contact or group)',
            },

            user_message: {
                type: DataTypes.TEXT,
                allowNull: false,
                comment: 'Original message from user',
            },

            ai_response: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: 'AI generated response',
            },

            knowledge_snapshot: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Snapshot of knowledge used for this conversation',
            },

            ai_model_used: {
                type: DataTypes.STRING(20),
                allowNull: false,
                comment: 'Model that generated response',
            },

            response_time_ms: {
                type: DataTypes.INTEGER,
                allowNull: true,
                comment: 'AI response time in milliseconds',
            },

            status: {
                type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
                allowNull: false,
                defaultValue: 'pending',
            },

            error_message: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
        },
        {
            tableName: 'ai_conversations',
            timestamps: true,
            indexes: [
                {
                    fields: ['ai_session_id'],
                    name: 'idx_ai_conversation_session',
                },
                {
                    fields: ['device_token'],
                    name: 'idx_ai_conversation_device',
                },
                {
                    fields: ['chat_id'],
                    name: 'idx_ai_conversation_chat',
                },
                {
                    fields: ['status'],
                    name: 'idx_ai_conversation_status',
                },
                {
                    fields: ['created_at'],
                    name: 'idx_ai_conversation_created',
                },
            ],
        },
    )

    AiConversation.associate = (models) => {
        AiConversation.belongsTo(models.AiSession, {
            foreignKey: 'ai_session_id',
            as: 'aiSession',
            onDelete: 'CASCADE',
        })

        AiConversation.belongsTo(models.Device, {
            foreignKey: 'device_token',
            targetKey: 'token',
            as: 'device',
            onDelete: 'CASCADE',
        })
    }

    return AiConversation
}
