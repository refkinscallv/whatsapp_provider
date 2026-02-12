'use strict'

const contactService = require('@app/services/contact.service')

/**
 * Contact Controller
 * Handles WhatsApp contacts and custom contact books
 */
class ContactController {
    /**
     * Helper to verify if user has access to a device
     * @param {string} userToken 
     * @param {string} deviceToken 
     * @returns {Promise<boolean>}
     */
    async checkDeviceAccess(userToken, deviceToken) {
        if (!deviceToken) return false;
        const db = require('@core/database.core')
        const access = await db.models.UserDevice.findOne({
            where: { user_token: userToken, device_token: deviceToken }
        })
        return !!access
    }

    /**
     * Sync contacts from device
     * POST /api/contacts/sync
     */
    async sync({ req, res }) {
        try {
            const { device_token } = req.body

            if (!device_token) {
                return res.status(400).json({
                    success: false,
                    message: 'Device token is required'
                })
            }

            // Verify Ownership
            const hasAccess = await this.checkDeviceAccess(req.user.token, device_token)
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: You do not own this device'
                })
            }

            const result = await contactService.syncContacts(device_token)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Get contacts for a device
     * GET /api/contacts
     */
    async getContacts({ req, res }) {
        try {
            const db = require('@core/database.core')
            const { Op } = db.Sequelize
            const { device_token, book_id, search, limit, offset } = req.query

            // Pagination params
            const parsedLimit = limit ? parseInt(limit) : null
            const parsedOffset = offset ? parseInt(offset) : 0

            // Handle Contact Book
            if (book_id) {
                const book = await db.models.ContactBook.findOne({
                    where: { id: book_id, user_token: req.user.token }
                })
                if (!book) throw new Error('Contact book not found')

                let contacts = (Array.isArray(book.contacts) ? book.contacts : []).map(c => {
                    const phone = (typeof c === 'object' ? (c.phone || c.whatsapp) : c)?.toString() || '';
                    const name = (typeof c === 'object' ? c.name : null) || 'Book Member';
                    return { phone, name, last_synced_at: c.added_at || book.updatedAt };
                });

                if (search) {
                    const s = search.toLowerCase()
                    contacts = contacts.filter(c =>
                        (c.name || '').toLowerCase().includes(s) ||
                        (c.phone || '').toLowerCase().includes(s)
                    )
                }

                // Apply pagination only if limit is provided
                const total = contacts.length
                const resultContacts = parsedLimit ? contacts.slice(parsedOffset, parsedOffset + parsedLimit) : contacts

                return res.status(200).json({
                    success: true,
                    contacts: resultContacts,
                    total,
                    limit: parsedLimit,
                    offset: parsedOffset
                })
            }

            // Verify Ownership
            if (device_token) {
                const hasAccess = await this.checkDeviceAccess(req.user.token, device_token)
                if (!hasAccess) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied: You do not own this device'
                    })
                }
            }

            // Build Where Clause
            const where = {}
            if (device_token) {
                where.device_token = device_token
            } else {
                const userDevices = await db.models.UserDevice.findAll({
                    where: { user_token: req.user.token }
                })
                where.device_token = { [Op.in]: userDevices.map(ud => ud.device_token) }
            }

            if (search) {
                where[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { phone: { [Op.like]: `%${search}%` } },
                    { whatsapp_id: { [Op.like]: `%${search}%` } }
                ]
            }

            // Fetch with optional pagination
            const findOptions = {
                where,
                order: [['last_synced_at', 'DESC']]
            }

            if (parsedLimit) {
                findOptions.limit = parsedLimit
                findOptions.offset = parsedOffset
            }

            const { count, rows: contacts } = await db.models.Contact.findAndCountAll(findOptions)

            return res.status(200).json({
                success: true,
                contacts,
                total: count,
                limit: parsedLimit,
                offset: parsedOffset
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Update synced contact
     * PUT /api/contacts/:id
     */
    async updateSyncedContact({ req, res }) {
        try {
            const db = require('@core/database.core')
            const { id } = req.params
            const { name } = req.body

            // Find contact and check device ownership
            const contact = await db.models.Contact.findByPk(id)
            if (!contact) throw new Error('Contact not found')

            const hasAccess = await this.checkDeviceAccess(req.user.token, contact.device_token)
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: You do not own the device this contact belongs to'
                })
            }

            const result = await contactService.updateContact(id, { name })
            return res.status(200).json({ success: true, contact: result })
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Get user contact books
     * GET /api/contacts/books
     */
    async getBooks({ req, res }) {
        try {
            const books = await contactService.getContactBooks(req.user.token)
            return res.status(200).json({
                success: true,
                books
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Save contact book (create or update)
     * POST /api/contacts/books
     */
    async saveBook({ req, res }) {
        try {
            const { name, description, color, id } = req.body

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Book name is required'
                })
            }

            const result = await contactService.saveContactBook(req.user.token, { id, name, description, color })
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Delete contact book
     * DELETE /api/contacts/books/:id
     */
    async deleteBook({ req, res }) {
        try {
            const { id } = req.params
            const result = await contactService.deleteContactBook(req.user.token, id)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            })
        }
    }

    /**
     * Add contact to book
     * POST /api/contacts/books/:id/contacts
     */
    async addBookContact({ req, res }) {
        try {
            const { id } = req.params
            const { name, phone } = req.body
            if (!name || !phone) throw new Error('Name and phone are required')

            const result = await contactService.addContactToBook(req.user.token, id, { name, phone })
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Bulk add contacts to book
     * POST /api/contacts/books/:id/contacts/bulk
     */
    async bulkAddBookContacts({ req, res }) {
        try {
            const { id } = req.params
            const { contacts } = req.body // Array of {name, phone}
            if (!Array.isArray(contacts)) throw new Error('Contacts array is required')

            const result = await contactService.addContactsToBook(req.user.token, id, contacts)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Remove contact from book
     * DELETE /api/contacts/books/:id/contacts/:phone
     */
    async removeBookContact({ req, res }) {
        try {
            const { id, phone } = req.params
            const result = await contactService.removeContactFromBook(req.user.token, id, phone)
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Update contact in book
     * PUT /api/contacts/books/:id/contacts/:phone
     */
    async updateBookContact({ req, res }) {
        try {
            const { id, phone } = req.params
            const { name, phone: newPhone } = req.body
            const result = await contactService.updateContactInBook(req.user.token, id, phone, { name, phone: newPhone })
            return res.status(200).json(result)
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message })
        }
    }

    /**
     * Get contact statistics
     * GET /api/contacts/stats
     */
    async getStats({ req, res }) {
        try {
            const stats = await contactService.getStats(req.user.token)
            return res.status(200).json({
                success: true,
                stats
            })
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            })
        }
    }
}

module.exports = ContactController
