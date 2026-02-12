'use strict'

module.exports = (sequelize, DataTypes) => {
    const UserResetPassword = sequelize.define(
        'UserResetPassword',
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
            tableName: 'user_reset_password',
            timestamps: true,
            indexes: [
                {
                    fields: ['user_token'],
                    name: 'idx_urp_user',
                },
                {
                    fields: ['email'],
                    name: 'idx_urp_email',
                },
                {
                    fields: ['is_used'],
                    name: 'idx_urp_used',
                },
                {
                    fields: ['expired_at'],
                    name: 'idx_urp_expired_at',
                },
            ],
        },
    )

    UserResetPassword.associate = (models) => {
        UserResetPassword.belongsTo(models.User, {
            foreignKey: 'user_token',
            targetKey: 'token',
            as: 'user',
            onDelete: 'SET NULL',
        })
    }

    return UserResetPassword
}
