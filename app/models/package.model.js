'use strict'

module.exports = (sequelize, DataTypes) => {
    const Package = sequelize.define(
        'Package',
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

            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },

            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            currency: {
                type: DataTypes.STRING,
                allowNull: true,
            },

            price: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: true,
            },

            period_amount: {
                type: DataTypes.STRING,
                allowNull: true,
            },

            period: {
                type: DataTypes.ENUM('DAILY', 'MONTHLY', 'YEARLY', 'ENTERPRISE'),
                allowNull: true,
            },

            limit_device: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },

            limit_generate_api_key: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },

            limit_domain_whitelist: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },

            limit_message: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },

            features: {
                type: DataTypes.TEXT('long'),
                allowNull: true,
                get() {
                    const rawValue = this.getDataValue('features')
                    return rawValue ? JSON.parse(rawValue) : null
                },
                set(value) {
                    this.setDataValue('features', value ? JSON.stringify(value) : null)
                },
            },
        },
        {
            tableName: 'packages',
            timestamps: true,
            indexes: [
                {
                    fields: ['is_active'],
                    name: 'idx_pkgs_active',
                },
                {
                    fields: ['currency'],
                    name: 'idx_pkgs_currency',
                },
                {
                    fields: ['price'],
                    name: 'idx_pkgs_price',
                },
                {
                    fields: ['period_amount'],
                    name: 'idx_pkgs_period_amount',
                },
                {
                    fields: ['period'],
                    name: 'idx_pkgs_period',
                },
            ],
        },
    )

    Package.associate = (models) => {
        Package.hasMany(models.UserSubscription, {
            foreignKey: 'package_token',
            sourceKey: 'token',
            as: 'subscriptions',
        })
    }

    return Package
}
