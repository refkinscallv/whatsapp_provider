'use strict'

const db = require('@core/database.core')
const Logger = require('@core/logger.core')
const whatsappService = require('./whatsapp.service')

/**
 * Contact Service
 * Manages WhatsApp contacts and custom contact books
 */
class ContactService {
    /**
     * Sync contacts from WhatsApp device
     * @param {string} deviceToken - Device token
     * @returns {Promise<object>}
     */
    async syncContacts(deviceToken) {
        try {
            Logger.info(`Syncing contacts for device: ${deviceToken}`)

            // Get contacts from WhatsApp
            const contacts = await whatsappService.syncContacts(deviceToken)

            // Run deduplication after sync as a safety measure
            await this.deduplicate(deviceToken)

            return {
                success: true,
                message: 'Contacts synchronized successfully',
                total: contacts.total || 0,
                synced: contacts.synced || 0
            }
        } catch (err) {
            Logger.error(`Failed to sync contacts for device ${deviceToken}`, err)
            throw err
        }
    }

    /**
     * Get contacts for a device
     * @param {string} deviceToken - Device token
     * @param {object} params - Query params (limit, offset, search)
     * @returns {Promise<object>}
     */
    async getContacts(deviceToken, params = {}) {
        const { limit, offset = 0, search = '' } = params
        const { Op } = db.Sequelize

        const where = { device_token: deviceToken }
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { whatsapp_id: { [Op.like]: `%${search}%` } },
                { push_name: { [Op.like]: `%${search}%` } }
            ]
        }

        const options = {
            where,
            order: [['name', 'ASC'], ['push_name', 'ASC']]
        }

        if (parseInt(limit) > 0) {
            options.limit = parseInt(limit)
            options.offset = parseInt(offset || 0)
        }

        const contacts = await db.models.Contact.findAndCountAll(options)

        return {
            total: contacts.count,
            contacts: contacts.rows
        }
    }

    /**
     * Detail synced contact
     * @param {string} id - Contact ID
     * @returns {Promise<object>}
     */
    async getContact(id) {
        return await db.models.Contact.findByPk(id)
    }

    /**
     * Update synced contact
     * @param {string} id - Contact ID
     * @param {object} data - Data to update
     * @returns {Promise<object>}
     */
    async updateContact(id, data) {
        const contact = await db.models.Contact.findByPk(id)
        if (!contact) throw new Error('Contact not found')

        await contact.update(data)
        return contact
    }

    /**
     * Create or update custom contact book
     * @param {string} userToken - User token
     * @param {object} data - Contact book data
     * @returns {Promise<object>}
     */
    async saveContactBook(userToken, data) {
        const { id, name, description, color } = data

        let contactBook
        if (id) {
            contactBook = await db.models.ContactBook.findOne({
                where: { id, user_token: userToken }
            })
            if (!contactBook) throw new Error('Contact book not found')

            await contactBook.update({ name, description, color })
        } else {
            const Hash = require('@core/helpers/hash.helper')
            contactBook = await db.models.ContactBook.create({
                token: Hash.token(),
                user_token: userToken,
                name,
                description,
                color
            })
        }

        return {
            success: true,
            contactBook
        }
    }

    /**
     * Add contact to book
     * @param {string} userToken
     * @param {string} bookId
     * @param {object} contact {name, phone}
     */
    async addContactToBook(userToken, bookId, contact) {
        const book = await db.models.ContactBook.findOne({
            where: { id: bookId, user_token: userToken }
        })
        if (!book) throw new Error('Book not found')

        const contacts = Array.isArray(book.contacts) ? book.contacts : []

        // Check duplicate phone
        if (contacts.find(c => c.phone == contact.phone || c.whatsapp == contact.phone)) {
            throw new Error('Contact with this phone already exists in book')
        }

        contacts.push({
            name: contact.name,
            phone: contact.phone,
            added_at: new Date()
        })

        await book.update({
            contacts: [...contacts],
            total_contacts: contacts.length
        })

        return { success: true, contacts }
    }

    /**
     * Add multiple contacts to book
     * @param {string} userToken
     * @param {string} bookId
     * @param {Array} newContacts [{name, phone}]
     */
    async addContactsToBook(userToken, bookId, newContacts) {
        const book = await db.models.ContactBook.findOne({
            where: { id: bookId, user_token: userToken }
        })
        if (!book) throw new Error('Book not found')

        let contacts = Array.isArray(book.contacts) ? book.contacts : []
        let addedCount = 0
        const existingPhones = new Set(contacts.map(c => String(c.phone || c.whatsapp).replace(/\D/g, '')))

        for (const contact of newContacts) {
            const phone = String(contact.phone).replace(/\D/g, '')
            if (phone && !existingPhones.has(phone)) {
                contacts.push({
                    name: contact.name,
                    phone: phone,
                    added_at: new Date()
                })
                existingPhones.add(phone)
                addedCount++
            }
        }

        if (addedCount > 0) {
            await book.update({
                contacts: [...contacts],
                total_contacts: contacts.length
            })
        }

        return { success: true, added: addedCount, total: contacts.length }
    }

    /**
     * Remove contact from book
     * @param {string} userToken
     * @param {string} bookId
     * @param {string} phone
     */
    async removeContactFromBook(userToken, bookId, phone) {
        const book = await db.models.ContactBook.findOne({
            where: { id: bookId, user_token: userToken }
        })
        if (!book) throw new Error('Book not found')

        let contacts = Array.isArray(book.contacts) ? book.contacts : []
        contacts = contacts.filter(c => (c.phone || c.whatsapp) != phone)

        await book.update({
            contacts,
            total_contacts: contacts.length
        })

        return { success: true, contacts }
    }

    /**
     * Update contact in book
     * @param {string} userToken
     * @param {string} bookId
     * @param {string} targetPhone
     * @param {object} data {name, phone}
     */
    async updateContactInBook(userToken, bookId, targetPhone, data) {
        const book = await db.models.ContactBook.findOne({
            where: { id: bookId, user_token: userToken }
        })
        if (!book) throw new Error('Book not found')

        const contacts = Array.isArray(book.contacts) ? book.contacts : []
        const index = contacts.findIndex(c => (c.phone || c.whatsapp) == targetPhone)

        if (index === -1) throw new Error('Contact not found in book')

        contacts[index] = {
            ...contacts[index],
            name: data.name || contacts[index].name,
            phone: data.phone || contacts[index].phone
        }

        await book.update({ contacts: [...contacts] })

        return { success: true, contacts }
    }

    /**
     * Get user contact books
     * @param {string} userToken - User token
     * @returns {Promise<Array>}
     */
    async getContactBooks(userToken) {
        return await db.models.ContactBook.findAll({
            where: { user_token: userToken },
            order: [['name', 'ASC']]
        })
    }

    /**
     * Delete contact book
     * @param {string} userToken - User token
     * @param {number} id - Contact book ID
     * @returns {Promise<object>}
     */
    async deleteContactBook(userToken, id) {
        const result = await db.models.ContactBook.destroy({
            where: { id, user_token: userToken }
        })

        if (!result) throw new Error('Contact book not found')

        return {
            success: true,
            message: 'Contact book deleted'
        }
    }
    /**
     * Background sync for all active devices
     * @returns {Promise<object>}
     */
    async backgroundSync() {
        try {
            // Find all ready devices
            const readyDevices = await db.models.Device.findAll({
                where: { status: 'ready' }
            })

            const count = readyDevices.length
            if (count > 0) {
                Logger.info(`Running background contact sync for ${count} devices...`)
                for (const device of readyDevices) {
                    // We don't want one device sync failure to stop the whole process
                    try {
                        await this.syncContacts(device.token)
                    } catch (err) {
                        const isTransient = err.message.includes('detached Frame') ||
                            err.message.includes('Execution context was destroyed') ||
                            err.message.includes('not ready')

                        if (isTransient) {
                            Logger.warn(`Skipping background sync for device ${device.token} due to transient state: ${err.message}`)
                        } else {
                            Logger.error(`Failed background sync for device ${device.token}`, err)
                        }
                    }
                }
            }
            return { success: true, deviceCount: count }
        } catch (err) {
            Logger.error('Error during background contact sync', err)
            throw err
        }
    }

    /**
     * Deduplicate contacts for a specific device
     * Keeps the most recently updated record
     * @param {string} deviceToken 
     */
    async deduplicate(deviceToken) {
        try {
            if (!db.sequelize) return
            const { QueryTypes } = db.Sequelize

            // Raw query to find IDs of duplicates to delete
            // We keep the one with the highest ID (most recent auto-increment)
            const duplicates = await db.sequelize.query(`
                SELECT id FROM contacts 
                WHERE device_token = :deviceToken 
                AND id NOT IN (
                    SELECT MAX(id) 
                    FROM contacts 
                    WHERE device_token = :deviceToken 
                    GROUP BY whatsapp_id
                )
            `, {
                replacements: { deviceToken },
                type: QueryTypes.SELECT
            })

            if (duplicates.length > 0) {
                const ids = duplicates.map(d => d.id)
                await db.models.Contact.destroy({
                    where: { id: { [db.Sequelize.Op.in]: ids } }
                })
                Logger.info(`Deduplicated ${duplicates.length} contacts for device ${deviceToken}`)
            }
        } catch (err) {
            Logger.error(`Failed to deduplicate contacts for device ${deviceToken}`, err)
        }
    }

    /**
     * Deduplicate all contacts in the system
     */
    async deduplicateAll() {
        try {
            if (!db.sequelize) return
            const { QueryTypes } = db.Sequelize

            const duplicates = await db.sequelize.query(`
                SELECT id FROM contacts 
                WHERE id NOT IN (
                    SELECT MAX(id) 
                    FROM (SELECT id, device_token, whatsapp_id FROM contacts) as c
                    GROUP BY device_token, whatsapp_id
                )
            `, {
                type: QueryTypes.SELECT
            })

            if (duplicates.length > 0) {
                const ids = duplicates.map(d => d.id)
                await db.models.Contact.destroy({
                    where: { id: { [db.Sequelize.Op.in]: ids } }
                })
                Logger.info(`System-wide contact deduplication completed: ${duplicates.length} records removed`)
            }
        } catch (err) {
            Logger.error('Failed system-wide contact deduplication', err)
        }
    }

    /**
     * Get contact statistics for a user
     * @param {string} userToken - User token
     * @returns {Promise<object>}
     */
    async getStats(userToken) {
        // Find devices owned by user to filter contacts
        const userDevices = await db.models.UserDevice.findAll({
            where: { user_token: userToken },
            attributes: ['device_token']
        })
        const deviceTokens = userDevices.map(ud => ud.device_token)

        const [totalSynced, totalBooks, bookMembers] = await Promise.all([
            db.models.Contact.count({
                where: { device_token: { [db.Sequelize.Op.in]: deviceTokens } }
            }),
            db.models.ContactBook.count({
                where: { user_token: userToken }
            }),
            db.models.ContactBook.sum('total_contacts', {
                where: { user_token: userToken }
            })
        ])

        return {
            total_synced: totalSynced || 0,
            total_books: totalBooks || 0,
            total_book_members: bookMembers || 0
        }
    }
}

module.exports = new ContactService()
