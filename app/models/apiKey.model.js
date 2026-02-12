'use strict'

module.exports = (sequelize, DataTypes) => {
    const ApiKey = sequelize.define(
        'ApiKey',
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

            key: {
                type: DataTypes.STRING(64),
                allowNull: false,
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

            domain_whitelist: {
                type: DataTypes.TEXT,
                allowNull: true,
                defaultValue: '*',
                comment: 'Comma-separated domains or *',
            },

            ip_whitelist: {
                type: DataTypes.TEXT,
                allowNull: true,
                defaultValue: '*',
                comment: 'Comma-separated IPs or *',
            },

            last_used_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            usage_count: {
                type: DataTypes.BIGINT.UNSIGNED,
                allowNull: false,
                defaultValue: 0,
            },

            expired_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'api_keys',
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ['key'],
                    name: 'idx_apikey_key',
                },
                {
                    fields: ['user_token'],
                    name: 'idx_apikey_user',
                },
                {
                    fields: ['is_active'],
                    name: 'idx_apikey_active',
                },
            ],
        },
    )

    ApiKey.associate = (models) => {
        ApiKey.belongsTo(models.User, {
            foreignKey: 'user_token',
            targetKey: 'token',
            as: 'user',
            onDelete: 'CASCADE',
        })
    }

    return ApiKey
}
