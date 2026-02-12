'use strict'

module.exports = (sequelize, DataTypes) => {
    const UserSubscriptionUsage = sequelize.define(
        'UserSubscriptionUsage',
        {
            id: {
                type: DataTypes.BIGINT.UNSIGNED,
                primaryKey: true,
                autoIncrement: true,
            },

            subscription_token: {
                type: DataTypes.STRING(32),
                allowNull: true,
            },
            user_token: {
                type: DataTypes.STRING(32),
                allowNull: true,
            },

            remaining_device: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },

            remaining_api_key: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },

            remaining_domain: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },

            remaining_message: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            last_reset_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'user_subscription_usage',
            timestamps: true,
            indexes: [
                {
                    fields: ['subscription_token'],
                    name: 'idx_usage_subscription',
                },
            ],
        },
    )

    UserSubscriptionUsage.associate = (models) => {
        UserSubscriptionUsage.belongsTo(models.UserSubscription, {
            foreignKey: 'subscription_token',
            targetKey: 'token',
            as: 'subscription',
            onDelete: 'SET NULL',
        })
    }

    return UserSubscriptionUsage
}
