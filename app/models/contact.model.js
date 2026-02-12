'use strict'

module.exports = (sequelize, DataTypes) => {
    const Contact = sequelize.define(
        'Contact',
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

            device_token: {
                type: DataTypes.STRING(32),
                allowNull: false,
            },

            whatsapp_id: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'WhatsApp contact ID',
            },

            phone: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            name: {
                type: DataTypes.STRING,
                allowNull: true,
            },

            push_name: {
                type: DataTypes.STRING,
                allowNull: true,
            },

            is_business: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            is_enterprise: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            is_my_contact: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            profile_pic_url: {
                type: DataTypes.STRING(500),
                allowNull: true,
            },

            metadata: {
                type: DataTypes.JSON,
                allowNull: true,
            },

            last_synced_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'contacts',
            timestamps: true,
            indexes: [
                {
                    fields: ['device_token'],
                    name: 'idx_contact_device',
                },
                {
                    fields: ['whatsapp_id'],
                    name: 'idx_contact_wa_id',
                },
                {
                    fields: ['phone'],
                    name: 'idx_contact_phone',
                },
                {
                    unique: true,
                    fields: ['device_token', 'whatsapp_id'],
                    name: 'idx_contact_device_wa_unique',
                },
            ],
        },
    )

    Contact.associate = (models) => {
        Contact.belongsTo(models.Device, {
            foreignKey: 'device_token',
            targetKey: 'token',
            as: 'device',
            onDelete: 'CASCADE',
        })
    }

    return Contact
}
