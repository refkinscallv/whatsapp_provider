'use strict'

const BaseController = require('./base.controller')
const datatableService = require('@app/services/datatable.service')
const db = require('@core/database.core')

class DataTableController extends BaseController {
    /**
     * Get users datatable (Admin)
     */
    async getUsersDataTable({ req, res }) {
        try {
            const params = req.body
            const customFilters = {}

            // Parse custom filters from request
            if (params.user_type) customFilters.user_type = params.user_type
            if (params.status) customFilters.status = params.status
            if (params.role) customFilters.role = params.role
            if (params.created_from) customFilters.createdAt_from = params.created_from
            if (params.created_to) customFilters.createdAt_to = params.created_to

            const options = {
                include: [
                    {
                        model: db.models.UserSubscription,
                        as: 'subscriptions',
                        required: false,
                        separate: true,
                        limit: 1,
                        order: [['createdAt', 'DESC']]
                    }
                ],
                searchableColumns: ['name', 'email', 'whatsapp'],
                customFilters,
                defaultOrder: [['createdAt', 'DESC']]
            }

            const result = await datatableService.buildDataTableQuery(db.models.User, params, options)
            return BaseController.json(res, true, 200, 'Users data fetched', {}, result)
        } catch (error) {
            console.error('[DataTableController] getUsersDataTable error:', error)
            return BaseController.error(res, 'Failed to fetch users data', 500)
        }
    }

    /**
     * Get message history datatable
     */
    async getHistoryDataTable({ req, res }) {
        try {
            const params = req.body
            const customFilters = {
                user_token: req.user.token // Only user's own messages
            }

            // Parse custom filters
            if (params.device_token) customFilters.device_token = params.device_token
            if (params.provider) customFilters['device.provider'] = params.provider
            if (params.status) customFilters.status = params.status
            if (params.type) customFilters.type = params.type
            if (params.sent_from) customFilters.createdAt_from = params.sent_from
            if (params.sent_to) customFilters.createdAt_to = params.sent_to
            if (params.scheduled_msg_token) customFilters['MessageHistory.metadata->scheduled_msg_token'] = params.scheduled_msg_token

            const options = {
                include: [
                    {
                        model: db.models.User,
                        as: 'user',
                        attributes: ['name', 'email', 'token'],
                        required: false
                    },
                    {
                        model: db.models.Device,
                        as: 'device',
                        attributes: ['name', 'token'],
                        required: false
                    }
                ],
                searchableColumns: ['to', 'message'],
                customFilters,
                defaultOrder: [['createdAt', 'DESC']]
            }

            const result = await datatableService.buildDataTableQuery(db.models.MessageHistory, params, options)
            return BaseController.json(res, true, 200, 'History data fetched', {}, result)
        } catch (error) {
            console.error('[DataTableController] getHistoryDataTable error:', error)
            return BaseController.error(res, 'Failed to fetch history data', 500)
        }
    }

    /**
     * Get contacts datatable
     */
    async getContactsDataTable({ req, res }) {
        try {
            const params = req.body
            // Contacts don't have user_token, but devices are linked to users via UserDevice
            const userDevices = await db.models.UserDevice.findAll({
                where: { user_token: req.user.token },
                include: [{
                    model: db.models.Device,
                    as: 'device',
                    where: { is_deleted: false },
                    required: true
                }],
                attributes: ['device_token']
            })
            const deviceTokens = userDevices.map(ud => ud.device_token)

            const customFilters = {}

            // Parse custom filters
            if (params.device_token) {
                // Security: Ensure requested device belongs to user
                if (deviceTokens.includes(params.device_token)) {
                    customFilters.device_token = params.device_token
                } else {
                    // Force filter to user's devices if invalid token provided
                    customFilters.device_token = { [db.Op.in]: deviceTokens }
                }
            } else {
                customFilters.device_token = { [db.Op.in]: deviceTokens }
            }

            if (params.provider) customFilters['device.provider'] = params.provider

            if (params.has_name === 'yes') {
                customFilters.name = { [db.Op.ne]: null }
            } else if (params.has_name === 'no') {
                customFilters.name = null
            }
            if (params.synced_from) customFilters.last_synced_at_from = params.synced_from
            if (params.synced_to) customFilters.last_synced_at_to = params.synced_to

            const options = {
                include: [
                    {
                        model: db.models.Device,
                        as: 'device',
                        attributes: ['name', 'token'],
                        required: false
                    }
                ],
                searchableColumns: ['name', 'phone', 'whatsapp'],
                customFilters,
                defaultOrder: [['last_synced_at', 'DESC']]
            }

            const result = await datatableService.buildDataTableQuery(db.models.Contact, params, options)
            return BaseController.json(res, true, 200, 'Contacts data fetched', {}, result)
        } catch (error) {
            console.error('[DataTableController] getContactsDataTable error:', error)
            return BaseController.error(res, 'Failed to fetch contacts data', 500)
        }
    }

    /**
     * Get campaigns datatable
     */
    async getCampaignsDataTable({ req, res }) {
        try {
            const params = req.body
            const customFilters = {
                user_token: req.user.token // Only user's own campaigns
            }

            // Parse custom filters
            if (params.device_token) customFilters.device_token = params.device_token
            if (params.provider) customFilters['device.provider'] = params.provider
            if (params.status) customFilters.status = params.status
            if (params.has_media === 'yes') {
                customFilters.media_url = { [db.Op.ne]: null }
            } else if (params.has_media === 'no') {
                customFilters.media_url = null
            }
            if (params.created_from) customFilters.createdAt_from = params.created_from
            if (params.created_to) customFilters.createdAt_to = params.created_to

            const options = {
                include: [
                    {
                        model: db.models.User,
                        as: 'user',
                        attributes: ['name', 'email', 'token'],
                        required: false
                    },
                    {
                        model: db.models.Device,
                        as: 'device',
                        attributes: ['name', 'token'],
                        required: false
                    }
                ],
                searchableColumns: ['name', 'message'],
                customFilters,
                defaultOrder: [['createdAt', 'DESC']]
            }

            const result = await datatableService.buildDataTableQuery(db.models.Campaign, params, options)
            return BaseController.json(res, true, 200, 'Campaigns data fetched', {}, result)
        } catch (error) {
            console.error('[DataTableController] getCampaignsDataTable error:', error)
            return BaseController.error(res, 'Failed to fetch campaigns data', 500)
        }
    }

    /**
     * Get scheduled messages datatable
     */
    async getScheduledMessagesDataTable({ req, res }) {
        try {
            const params = req.body
            const customFilters = {
                user_token: req.user.token // Only user's own scheduled messages
            }

            // Parse custom filters
            if (params.device_token) customFilters.device_token = params.device_token
            if (params.provider) customFilters['device.provider'] = params.provider
            if (params.status) customFilters.status = params.status
            if (params.has_media === 'yes') {
                customFilters.media_url = { [db.Op.ne]: null }
            } else if (params.has_media === 'no') {
                customFilters.media_url = null
            }
            if (params.scheduled_from) customFilters.scheduled_at_from = params.scheduled_from
            if (params.scheduled_to) customFilters.scheduled_at_to = params.scheduled_to

            // Parse recurring filters
            if (params.is_recurring === 'yes') {
                customFilters.is_recurring = true
            } else if (params.is_recurring === 'no') {
                customFilters.is_recurring = false
            }
            if (params.recurrence_type) customFilters.recurrence_type = params.recurrence_type

            const options = {
                include: [
                    {
                        model: db.models.User,
                        as: 'user',
                        attributes: ['name', 'email', 'token'],
                        required: false
                    },
                    {
                        model: db.models.Device,
                        as: 'device',
                        attributes: ['name', 'token'],
                        required: false
                    }
                ],
                searchableColumns: ['to', 'message'],
                customFilters,
                defaultOrder: [['scheduled_at', 'ASC']]
            }

            const result = await datatableService.buildDataTableQuery(db.models.ScheduledMessage, params, options)
            return BaseController.json(res, true, 200, 'Scheduled messages data fetched', {}, result)
        } catch (error) {
            console.error('[DataTableController] getScheduledMessagesDataTable error:', error)
            return BaseController.error(res, 'Failed to fetch scheduled messages data', 500)
        }
    }

    /**
     * Get API Keys datatable
     */
    async getApiKeysDataTable({ req, res }) {
        try {
            const params = req.body
            const customFilters = {
                user_token: req.user.token
            }

            if (params.status) customFilters.status = params.status

            const options = {
                searchableColumns: ['name', 'key'],
                customFilters,
                defaultOrder: [['createdAt', 'DESC']]
            }

            const result = await datatableService.buildDataTableQuery(db.models.ApiKey, params, options)
            return BaseController.json(res, true, 200, 'API Keys data fetched', {}, result)
        } catch (error) {
            console.error('[DataTableController] getApiKeysDataTable error:', error)
            return BaseController.error(res, 'Failed to fetch API Keys data', 500)
        }
    }

    /**
     * Get Webhooks datatable
     */
    async getWebhooksDataTable({ req, res }) {
        try {
            const params = req.body
            const customFilters = {
                user_token: req.user.token
            }

            if (params.device_token) customFilters.device_token = params.device_token
            if (params.status) customFilters.status = params.status

            const options = {
                include: [
                    {
                        model: db.models.Device,
                        as: 'device',
                        attributes: ['name', 'token'],
                        required: false
                    }
                ],
                searchableColumns: ['name', 'url'],
                customFilters,
                defaultOrder: [['createdAt', 'DESC']]
            }

            const result = await datatableService.buildDataTableQuery(db.models.Webhook, params, options)
            return BaseController.json(res, true, 200, 'Webhooks data fetched', {}, result)
        } catch (error) {
            console.error('[DataTableController] getWebhooksDataTable error:', error)
            return BaseController.error(res, 'Failed to fetch Webhooks data', 500)
        }
    }

    /**
     * Get device users datatable
     */
    async getDeviceUsersDataTable({ req, res }) {
        try {
            const params = req.body
            const { device_token } = params

            if (!device_token) {
                return BaseController.error(res, 'Device token is required', 400)
            }

            // Security: Check if user has access to the device
            const deviceCheck = await db.models.UserDevice.findOne({
                where: { user_token: req.user.token, device_token: device_token }
            })
            if (!deviceCheck) {
                return BaseController.error(res, 'Unauthorized access to this device', 403)
            }

            const options = {
                include: [
                    {
                        model: db.models.User,
                        as: 'user',
                        attributes: ['name', 'email', 'whatsapp', 'token'],
                        required: true
                    }
                ],
                where: { device_token },
                searchableColumns: ['user.name', 'user.email', 'user.whatsapp'],
                defaultOrder: [[{ model: db.models.User, as: 'user' }, 'name', 'ASC']]
            }

            const result = await datatableService.buildDataTableQuery(db.models.UserDevice, params, options)

            return BaseController.json(res, true, 200, 'Device users data fetched', {}, result)
        } catch (error) {
            console.error('[DataTableController] getDeviceUsersDataTable error:', error)
            return BaseController.error(res, 'Failed to fetch device users data', 500)
        }
    }

    /**
     * Get book members datatable
     */
    async getBookMembersDataTable({ req, res }) {
        try {
            const params = req.body
            const { book_id } = params

            if (!book_id) {
                return BaseController.error(res, 'Book ID is required', 400)
            }

            // Fetch book
            const book = await db.models.ContactBook.findOne({
                where: { id: book_id, user_token: req.user.token }
            })

            if (!book) {
                return BaseController.error(res, 'Contact book not found', 404)
            }

            // Get contacts from JSON
            let contacts = Array.isArray(book.contacts) ? book.contacts : []

            // Map to standard format if needed, ensuring name and phone are present
            contacts = contacts.map((c, index) => {
                const phone = (typeof c === 'object' ? (c.phone || c.whatsapp) : c)?.toString() || ''
                const name = (typeof c === 'object' ? c.name : null) || 'Book Member'
                const added_at = (typeof c === 'object' ? c.added_at : null) || book.updatedAt
                return { id: index + 1, name, phone, added_at, whatsapp: phone }
            })

            const recordsTotal = contacts.length

            // 1. Apply Filtering (Search)
            if (params.search && params.search.value) {
                const searchValue = params.search.value.toLowerCase()
                contacts = contacts.filter(c =>
                    (c.name || '').toLowerCase().includes(searchValue) ||
                    (c.phone || '').toLowerCase().includes(searchValue)
                )
            }

            const recordsFiltered = contacts.length

            // 2. Apply Ordering
            if (params.order && params.order.length > 0 && params.columns) {
                const order = params.order[0]
                const column = params.columns[order.column].data
                const dir = order.dir === 'asc' ? 1 : -1

                contacts.sort((a, b) => {
                    const valA = (a[column] || '').toString().toLowerCase()
                    const valB = (b[column] || '').toString().toLowerCase()
                    if (valA < valB) return -1 * dir
                    if (valA > valB) return 1 * dir
                    return 0
                })
            }

            // 3. Apply Pagination
            const start = parseInt(params.start) || 0
            const length = parseInt(params.length) || 10
            const pagedData = contacts.slice(start, start + length)

            const result = {
                draw: parseInt(params.draw) || 1,
                recordsTotal,
                recordsFiltered,
                data: pagedData
            }

            return BaseController.json(res, true, 200, 'Book members fetched', {}, result)
        } catch (error) {
            console.error('[DataTableController] getBookMembersDataTable error:', error)
            return BaseController.error(res, 'Failed to fetch book members', 500)
        }
    }

    /**
     * Get number check results datatable
     */
    async getNumberCheckDataTable({ req, res }) {
        try {
            const params = req.body
            const customFilters = {
                user_token: req.user.token
            }

            // Parse custom filters
            if (params.device_token) customFilters.device_token = params.device_token
            if (params.provider) customFilters['device.provider'] = params.provider
            if (params.batch_id) customFilters.batch_id = params.batch_id
            if (params.exists === 'yes') customFilters.exists = true
            if (params.exists === 'no') customFilters.exists = false
            if (params.status) customFilters.status = params.status
            if (params.created_from) customFilters.createdAt_from = params.created_from
            if (params.created_to) customFilters.createdAt_to = params.created_to

            const options = {
                include: [
                    {
                        model: db.models.Device,
                        as: 'device',
                        attributes: ['name', 'token'],
                        required: false
                    }
                ],
                searchableColumns: ['number', 'message'],
                customFilters,
                defaultOrder: [['createdAt', 'DESC']]
            }

            const result = await datatableService.buildDataTableQuery(db.models.NumberCheckResult, params, options)
            return BaseController.json(res, true, 200, 'Number check data fetched', {}, result)
        } catch (error) {
            console.error('[DataTableController] getNumberCheckDataTable error:', error)
            return BaseController.error(res, 'Failed to fetch number check data', 500)
        }
    }

    /**
     * Get subscriptions datatable (Admin)
     */
    async getSubscriptionsDataTable({ req, res }) {
        try {
            const params = req.body
            const customFilters = {}
            const { Op } = db

            // Handle filter parameter (all, active, expiring, expired)
            if (params.filter) {
                const now = new Date()
                const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

                switch (params.filter) {
                    case 'active':
                        customFilters.status = 'ACTIVE'
                        customFilters.expired_at_from = sevenDaysFromNow
                        break
                    case 'expiring':
                        customFilters.status = 'ACTIVE'
                        customFilters.expired_at_from = now
                        customFilters.expired_at_to = sevenDaysFromNow
                        break
                    case 'expired':
                        customFilters[Op.or] = [
                            { status: 'EXPIRED' },
                            {
                                status: 'ACTIVE',
                                expired_at_to: now
                            }
                        ]
                        break
                    // 'all' or default - no additional filters
                }
            }

            // Parse other custom filters
            if (params.status) customFilters.status = params.status
            if (params.package_token) customFilters.package_token = params.package_token
            if (params.is_auto_renew !== undefined) customFilters.is_auto_renew = params.is_auto_renew === 'true'
            if (params.started_from) customFilters.started_at_from = params.started_from
            if (params.started_to) customFilters.started_at_to = params.started_to
            if (params.expires_from) customFilters.expired_at_from = params.expires_from
            if (params.expires_to) customFilters.expired_at_to = params.expires_to

            const options = {
                include: [
                    {
                        model: db.models.User,
                        as: 'user',
                        attributes: ['name', 'email', 'token'],
                        required: false
                    },
                    {
                        model: db.models.Package,
                        as: 'package',
                        attributes: ['name', 'price', 'period'],
                        required: false
                    }
                ],
                searchableColumns: ['user.name', 'user.email', 'package.name'],
                customFilters,
                defaultOrder: [['createdAt', 'DESC']]
            }

            const result = await datatableService.buildDataTableQuery(db.models.UserSubscription, params, options)
            return BaseController.json(res, true, 200, 'Subscriptions data fetched', {}, result)
        } catch (error) {
            console.error('[DataTableController] getSubscriptionsDataTable error:', error)
            return BaseController.error(res, 'Failed to fetch subscriptions data', 500)
        }
    }

    /**
     * Get billing history datatable (Admin)
     */
    async getBillingHistoryDataTable({ req, res }) {
        try {
            const params = req.body
            const customFilters = {}

            // Parse custom filters
            if (params.filter_month) {
                const months = parseInt(params.filter_month)
                if (months > 0) {
                    const date = new Date()
                    date.setMonth(date.getMonth() - months)
                    customFilters.created_at_from = date
                }
            }
            if (params.status) customFilters.status = params.status
            if (params.package_token) customFilters.package_token = params.package_token

            const options = {
                include: [
                    {
                        model: db.models.User,
                        as: 'user',
                        attributes: ['name', 'email', 'token'],
                        required: false
                    },
                    {
                        model: db.models.Package,
                        as: 'package',
                        attributes: ['name', 'price', 'period'],
                        required: false
                    }
                ],
                searchableColumns: ['user.name', 'user.email', 'package.name'],
                customFilters,
                defaultOrder: [['createdAt', 'DESC']]
            }

            const result = await datatableService.buildDataTableQuery(db.models.UserSubscription, params, options)
            return BaseController.json(res, true, 200, 'Billing history data fetched', {}, result)
        } catch (error) {
            console.error('[DataTableController] getBillingHistoryDataTable error:', error)
            return BaseController.error(res, 'Failed to fetch billing history data', 500)
        }
    }

    /**
     * Get AI Sessions datatable
     */
    async getAiSessionsDataTable({ req, res }) {
        try {
            const params = req.body
            const customFilters = {
                user_token: req.user.token,
                '$AiSession.is_deleted$': 0  // Use Sequelize's $alias.column$ syntax
            }

            // Parse custom filters
            if (params.device_token) customFilters.device_token = params.device_token
            if (params.ai_model) customFilters.ai_model = params.ai_model
            if (params.status) customFilters.status = params.status
            if (params.language) customFilters.language = params.language

            const options = {
                include: [
                    {
                        model: db.models.Device,
                        as: 'device',
                        attributes: ['name', 'token'],
                        required: false
                    },
                    {
                        model: db.models.AiKnowledge,
                        as: 'knowledge',
                        attributes: ['id', 'name'],
                        required: false
                    }
                ],
                searchableColumns: ['device.name', 'ai_model', 'language'],
                customFilters,
                defaultOrder: [['updatedAt', 'DESC']]
            }

            const result = await datatableService.buildDataTableQuery(db.models.AiSession, params, options)
            return BaseController.json(res, true, 200, 'AI Sessions data fetched', {}, result)
        } catch (error) {
            console.error('[DataTableController] getAiSessionsDataTable error:', error)
            return BaseController.error(res, 'Failed to fetch AI Sessions data', 500)
        }
    }

    /**
     * Get AI Conversations datatable
     */
    async getAiConversationsDataTable({ req, res }) {
        try {
            const params = req.body
            const sessionToken = params.ai_session_token

            if (!sessionToken) {
                return BaseController.error(res, 'Session token is required', 400)
            }

            // Get session to verify ownership
            const session = await db.models.AiSession.findOne({
                where: { token: sessionToken, user_token: req.user.token, is_deleted: 0 }
            })

            if (!session) {
                return BaseController.error(res, 'Access denied', 403)
            }

            const options = {
                where: { ai_session_id: session.id },
                include: [
                    {
                        model: db.models.AiSession,
                        as: 'aiSession',
                        attributes: ['token', 'ai_model'],
                        required: false
                    }
                ],
                searchableColumns: ['chat_id', 'user_message', 'ai_response'],
                defaultOrder: [['createdAt', 'DESC']]
            }

            const result = await datatableService.buildDataTableQuery(db.models.AiConversation, params, options)
            return BaseController.json(res, true, 200, 'AI Conversations data fetched', {}, result)
        } catch (error) {
            console.error('[DataTableController] getAiConversationsDataTable error:', error)
            return BaseController.error(res, 'Failed to fetch AI Conversations data', 500)
        }
    }
}

module.exports = DataTableController
