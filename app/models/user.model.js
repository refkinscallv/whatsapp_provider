'use strict'

const bcrypt = require('bcrypt')

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define(
        'User',
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

            is_admin: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            role: {
                type: DataTypes.ENUM('SUPER_ADMIN', 'MEMBER'),
                allowNull: false,
                defaultValue: 'MEMBER',
            },

            status: {
                type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'UNVERIFIED'),
                allowNull: true,
            },

            user_type: {
                type: DataTypes.ENUM('PERSONAL', 'COMPANY'),
                allowNull: true,
            },

            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            whatsapp: {
                type: DataTypes.STRING(15),
                allowNull: false,
            },

            email: {
                type: DataTypes.STRING(350),
                allowNull: false,
            },

            password: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            metadata: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: {},
            },
        },
        {
            tableName: 'users',
            timestamps: true,
            indexes: [
                {
                    fields: ['is_admin'],
                    name: 'idx_user_admin',
                },
                {
                    fields: ['status'],
                    name: 'idx_user_status',
                },
                {
                    fields: ['user_type'],
                    name: 'idx_user_type',
                },
                {
                    unique: true,
                    fields: ['whatsapp'],
                    name: 'idx_user_whatsapp',
                },
                {
                    unique: true,
                    fields: ['email'],
                    name: 'idx_user_email',
                },
            ],
            hooks: {
                beforeCreate: async (user) => {
                    if (user.password) {
                        user.password = await bcrypt.hash(user.password, 10)
                    }
                },
                beforeUpdate: async (user) => {
                    if (user.changed('password')) {
                        user.password = await bcrypt.hash(user.password, 10)
                    }
                },
            },
        },
    )

    User.prototype.comparePassword = async function (password) {
        return await bcrypt.compare(password, this.password)
    }

    User.associate = (models) => {
        User.hasMany(models.UserSubscription, {
            foreignKey: 'user_token',
            sourceKey: 'token',
            as: 'subscriptions',
        })

        User.hasMany(models.UserEmailVerification, {
            foreignKey: 'user_token',
            sourceKey: 'token',
            as: 'emailVerifications',
        })

        User.hasMany(models.UserResetPassword, {
            foreignKey: 'user_token',
            sourceKey: 'token',
            as: 'resetPasswords',
        })

        User.belongsToMany(models.Device, {
            through: models.UserDevice,
            foreignKey: 'user_token',
            otherKey: 'device_token',
            sourceKey: 'token',
            targetKey: 'token',
            as: 'devices',
        })
    }

    return User
}
