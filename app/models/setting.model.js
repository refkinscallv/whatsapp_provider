'use strict'

module.exports = (sequelize, DataTypes) => {
    const Setting = sequelize.define(
        'Setting',
        {
            id: {
                type: DataTypes.BIGINT.UNSIGNED,
                primaryKey: true,
                autoIncrement: true,
            },

            key: {
                type: DataTypes.STRING(100),
                allowNull: false,
                unique: true,
            },

            value: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            group: {
                type: DataTypes.STRING(50),
                allowNull: false,
                defaultValue: 'general',
            },

            type: {
                type: DataTypes.ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON'),
                allowNull: false,
                defaultValue: 'STRING',
            },

            description: {
                type: DataTypes.STRING,
                allowNull: true,
            },
        },
        {
            tableName: 'settings',
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ['key'],
                    name: 'idx_settings_key',
                },
                {
                    fields: ['group'],
                    name: 'idx_settings_group',
                },
            ],
        },
    )

    return Setting
}
