'use strict'

module.exports = (sequelize, DataTypes) => {
    const AiKnowledge = sequelize.define(
        'AiKnowledge',
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

            parent_token: {
                type: DataTypes.STRING(32),
                allowNull: true,
                comment: 'NULL for main node, parent token for child nodes',
            },

            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
                comment: 'Knowledge item name (e.g. main, item_1, item_2)',
            },

            content: {
                type: DataTypes.TEXT,
                allowNull: false,
                comment: 'Knowledge content to inject in prompt',
            },

            order: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Display order',
            },

            is_deletable: {
                type: DataTypes.TINYINT(1),
                allowNull: false,
                defaultValue: 1,
                comment: '0 for main, 1 for child items',
            },
        },
        {
            tableName: 'ai_knowledge',
            timestamps: true,
            indexes: [
                {
                    fields: ['ai_session_id'],
                    name: 'idx_ai_knowledge_session',
                },
                {
                    fields: ['parent_token'],
                    name: 'idx_ai_knowledge_parent',
                },
                {
                    fields: ['order'],
                    name: 'idx_ai_knowledge_order',
                },
            ],
        },
    )

    AiKnowledge.associate = (models) => {
        AiKnowledge.belongsTo(models.AiSession, {
            foreignKey: 'ai_session_id',
            as: 'aiSession',
            onDelete: 'CASCADE',
        })

        // Self-referencing for hierarchy
        AiKnowledge.belongsTo(models.AiKnowledge, {
            foreignKey: 'parent_token',
            targetKey: 'token',
            as: 'parent',
            onDelete: 'CASCADE',
        })

        AiKnowledge.hasMany(models.AiKnowledge, {
            foreignKey: 'parent_token',
            sourceKey: 'token',
            as: 'children',
        })
    }

    return AiKnowledge
}
