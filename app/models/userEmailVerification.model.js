'use strict'

module.exports = (sequelize, DataTypes) => {
    const UserEmailVerification = sequelize.define(
        'UserEmailVerification',
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

            email: {
                type: DataTypes.STRING(350),
                allowNull: false,
            },

            is_used: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            expired_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'user_email_verification',
            timestamps: true,
            indexes: [
                {
                    fields: ['user_token'],
                    name: 'idx_uev_user',
                },
                {
                    fields: ['email'],
                    name: 'idx_uev_email',
                },
                {
                    fields: ['is_used'],
                    name: 'idx_uev_used',
                },
                {
                    fields: ['expired_at'],
                    name: 'idx_uev_expired_at',
                },
            ],
        },
    )

    UserEmailVerification.associate = (models) => {
        UserEmailVerification.belongsTo(models.User, {
            foreignKey: 'user_token',
            targetKey: 'token',
            as: 'user',
            onDelete: 'SET NULL',
        })
    }

    return UserEmailVerification
}
