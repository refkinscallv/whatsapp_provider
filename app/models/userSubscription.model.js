'use strict'

module.exports = (sequelize, DataTypes) => {
    const UserSubscription = sequelize.define(
        'UserSubscription',
        {
            id: {
                type: DataTypes.BIGINT.UNSIGNED,
                primaryKey: true,
                autoIncrement: true,
            },

            user_token: {
                type: DataTypes.STRING(32),
                allowNull: true,
            },

            package_token: {
                type: DataTypes.STRING(32),
                allowNull: true,
            },

            token: {
                type: DataTypes.STRING(32),
                allowNull: false,
                unique: true,
            },

            status: {
                type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'CANCELLED'),
                allowNull: false,
                defaultValue: 'ACTIVE',
            },

            started_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },

            expired_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },

            is_auto_renew: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        },
        {
            tableName: 'user_subscriptions',
            timestamps: true,
            indexes: [
                {
                    fields: ['user_token'],
                    name: 'idx_sub_user',
                },
                {
                    fields: ['package_token'],
                    name: 'idx_sub_package',
                },
                {
                    fields: ['status'],
                    name: 'idx_sub_status',
                },
                {
                    fields: ['started_at'],
                    name: 'idx_sub_started_at',
                },
                {
                    fields: ['expired_at'],
                    name: 'idx_sub_expired_at',
                },
                {
                    fields: ['is_auto_renew'],
                    name: 'idx_sub_auto_renew',
                },
            ],
        },
    )

    UserSubscription.associate = (models) => {
        UserSubscription.belongsTo(models.User, {
            foreignKey: 'user_token',
            targetKey: 'token',
            as: 'user',
            onDelete: 'SET NULL',
        })

        UserSubscription.belongsTo(models.Package, {
            foreignKey: 'package_token',
            targetKey: 'token',
            as: 'package',
            onDelete: 'SET NULL',
        })

        UserSubscription.hasOne(models.UserSubscriptionUsage, {
            foreignKey: 'subscription_token',
            sourceKey: 'token',
            as: 'usage',
        })
    }

    return UserSubscription
}
