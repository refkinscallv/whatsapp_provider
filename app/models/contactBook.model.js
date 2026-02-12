'use strict'

module.exports = (sequelize, DataTypes) => {
    const ContactBook = sequelize.define(
        'ContactBook',
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

            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            contacts: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Array of contact objects',
            },

            tags: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Array of tags',
            },

            total_contacts: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
        },
        {
            tableName: 'contact_books',
            timestamps: true,
            indexes: [
                {
                    fields: ['user_token'],
                    name: 'idx_contact_book_user',
                },
            ],
        },
    )

    ContactBook.associate = (models) => {
        ContactBook.belongsTo(models.User, {
            foreignKey: 'user_token',
            targetKey: 'token',
            as: 'user',
            onDelete: 'CASCADE',
        })
    }

    return ContactBook
}
