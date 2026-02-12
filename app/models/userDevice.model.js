'use strict'

module.exports = (sequelize, DataTypes) => {
    const UserDevice = sequelize.define(
        'UserDevice',
        {
            id: {
                type: DataTypes.BIGINT.UNSIGNED,
                primaryKey: true,
                autoIncrement: true,
            },

            user_token: {
                type: DataTypes.STRING(32),
                allowNull: false,
            },

            device_token: {
                type: DataTypes.STRING(32),
                allowNull: false,
            },

            is_host: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        },
        {
            tableName: 'user_device',
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ['user_token', 'device_token'],
                    name: 'idx_user_device_unique',
                },
                {
                    fields: ['is_host'],
                    name: 'idx_user_device_host',
                },
            ],
        },
    )

    UserDevice.associate = (models) => {
        UserDevice.belongsTo(models.User, {
            foreignKey: 'user_token',
            targetKey: 'token',
            as: 'user',
            onDelete: 'CASCADE',
        })

        UserDevice.belongsTo(models.Device, {
            foreignKey: 'device_token',
            targetKey: 'token',
            as: 'device',
            onDelete: 'CASCADE',
        })
    }

    return UserDevice
}
