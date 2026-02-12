'use strict'

module.exports = (sequelize, DataTypes) => {
    const NumberCheckResult = sequelize.define(
        'NumberCheckResult',
        {
            id: {
                type: DataTypes.BIGINT.UNSIGNED,
                primaryKey: true,
                autoIncrement: true,
            },

            batch_id: {
                type: DataTypes.STRING(64),
                allowNull: false,
                comment: 'Identifier to group results from the same check request',
            },

            user_token: {
                type: DataTypes.STRING(32),
                allowNull: false,
            },

            device_token: {
                type: DataTypes.STRING(32),
                allowNull: false,
            },

            number: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            exists: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            status: {
                type: DataTypes.ENUM('success', 'error'),
                allowNull: false,
                defaultValue: 'success',
            },

            message: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
        },
        {
            tableName: 'number_check_results',
            timestamps: true,
            indexes: [
                {
                    fields: ['batch_id'],
                    name: 'idx_num_check_batch_id',
                },
                {
                    fields: ['user_token'],
                    name: 'idx_num_check_user_token',
                },
                {
                    fields: ['device_token'],
                    name: 'idx_num_check_device_token',
                },
                {
                    fields: ['number'],
                    name: 'idx_num_check_number',
                },
                {
                    fields: ['exists'],
                    name: 'idx_num_check_exists',
                },
            ],
        }
    )

    NumberCheckResult.associate = (models) => {
        NumberCheckResult.belongsTo(models.Device, {
            foreignKey: 'device_token',
            targetKey: 'token',
            as: 'device',
            onDelete: 'CASCADE',
        })

        NumberCheckResult.belongsTo(models.User, {
            foreignKey: 'user_token',
            targetKey: 'token',
            as: 'user',
            onDelete: 'CASCADE',
        })
    }

    return NumberCheckResult
}
