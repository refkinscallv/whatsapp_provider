'use strict'

const Routes = require('@refkinscallv/express-routing')
const authController = require('@app/http/controllers/auth.controller')
const deviceController = require('@app/http/controllers/device.controller')
const messageController = require('@app/http/controllers/message.controller')
const contactController = require('@app/http/controllers/contact.controller')
const templateController = require('@app/http/controllers/template.controller')
const autoReplyController = require('@app/http/controllers/autoReply.controller')
const campaignController = require('@app/http/controllers/campaign.controller')
const scheduledMessageController = require('@app/http/controllers/scheduledMessage.controller')
const webhookController = require('@app/http/controllers/webhook.controller')
const apiKeyController = require('@app/http/controllers/apiKey.controller')
const dashboardController = require('@app/http/controllers/dashboard.controller')
const adminController = require('@app/http/controllers/admin.controller')
const logController = require('@app/http/controllers/log.controller')
const settingsController = require('@app/http/controllers/settings.controller')
const publicController = require('@app/http/controllers/public.controller')
const datatableController = require('@app/http/controllers/datatable.controller')
const config = require('@app/config')
const authMiddleware = require('@app/http/middlewares/auth.middleware')
const adminMiddleware = require('@app/http/middlewares/admin.middleware')
const subscriptionMiddleware = require('@app/http/middlewares/subscription.middleware')
const internalAuthMiddleware = require('@app/http/middlewares/internalAuth.middleware')
const apiKeyMiddleware = require('@app/http/middlewares/apiKey.middleware')

Routes.group('api', () => {
    // Health check
    Routes.get('health', ({ res }) => {
        res.json({
            success: true,
            message: 'WARF API is running',
            timestamp: new Date().toISOString(),
            mode: config.app.mode
        })
    })

    // Public Stats (for landing page)
    Routes.get('public/stats', [publicController, 'getStats'])

    // --- PRIVATE / SERVER-TO-SERVER APIs ---
    // Protected by Master API Key, bypasses all limits
    Routes.group('private', () => {
        Routes.group('messages', () => {
            Routes.post('send', [messageController, 'send'])
            Routes.post('bulk', [messageController, 'sendBulk'])
        })
        Routes.group('devices', () => {
            Routes.get('', [deviceController, 'getUserDevices'])
            Routes.get(':token', [deviceController, 'getDevice'])
        })
    }, [internalAuthMiddleware])

    // --- PUBLIC / EXTERNAL APIs ---
    // Protected by wf_ api keys, subject to subscription limits
    Routes.group('v1', () => {
        Routes.group('messages', () => {
            Routes.post('send', [messageController, 'send'], [subscriptionMiddleware('messages')])
            Routes.post('bulk', [messageController, 'sendBulk'], [subscriptionMiddleware('messages')])
            Routes.post('media', [messageController, 'sendMedia'], [subscriptionMiddleware('messages')])
        })
        Routes.group('devices', () => {
            Routes.get('', [deviceController, 'getUserDevices'])
            Routes.get(':token', [deviceController, 'getDevice'])
        })
    }, [apiKeyMiddleware])

    // --- DASHBOARD / WEB APIs ---
    // Protected by Session/JWT token (User Registration, Login, Dashboard UI)

    // Log Routes
    Routes.post('logs/client', [logController, 'clientError'])

    // Auth Routes
    Routes.group('auth', () => {
        Routes.post('register', [authController, 'register'])
        Routes.post('login', [authController, 'login'])
        Routes.post('forgot-password', [authController, 'forgotPassword'])
        Routes.post('reset-password', [authController, 'resetPassword'])
        Routes.get('verify-email', [authController, 'verifyEmail'])

        // Protected Auth Routes
        Routes.group('', () => {
            Routes.post('logout', [authController, 'logout'])
            Routes.get('me', [authController, 'me'])
            Routes.put('profile', [authController, 'updateProfile'])
            Routes.post('change-password', [authController, 'changePassword'])
        }, [authMiddleware])
    })

    // Device Routes
    Routes.group('devices', () => {
        Routes.get('', [deviceController, 'getUserDevices'])
        Routes.post('', [deviceController, 'create'], [subscriptionMiddleware('devices')])
        Routes.get(':token', [deviceController, 'getDevice'])
        Routes.put(':token', [deviceController, 'updateName'])
        Routes.delete(':token', [deviceController, 'delete'])

        // Device Actions
        Routes.post(':token/initialize', [deviceController, 'initialize'])
        Routes.get(':token/qr', [deviceController, 'getQR'])
        Routes.post(':token/logout', [deviceController, 'logout'])
        Routes.post(':token/invite', [deviceController, 'invite'])
        Routes.delete(':token/users/:userToken', [deviceController, 'revoke'])
        Routes.post(':token/check', [deviceController, 'checkNumbers'])
    }, [authMiddleware])

    // Message Routes (Dashboard History/Queue)
    Routes.group('messages', () => {
        Routes.post('send', [messageController, 'send'], [subscriptionMiddleware('messages')])
        Routes.post('bulk', [messageController, 'sendBulk'], [subscriptionMiddleware('messages')])
        Routes.post('media', [messageController, 'sendMedia'], [subscriptionMiddleware('messages')])
        Routes.get('history', [messageController, 'getHistory'])
        Routes.delete('history/clear', [messageController, 'clearHistory'])
        Routes.get('history/stats', [messageController, 'getHistoryStats'])
        Routes.get('queue/stats', [messageController, 'getQueueStats'])
    }, [authMiddleware])

    // Contact Routes
    Routes.group('contacts', () => {
        Routes.get('stats', [contactController, 'getStats'])
        Routes.post('sync', [contactController, 'sync'])
        Routes.get('', [contactController, 'getContacts'])
        Routes.put(':id', [contactController, 'updateSyncedContact'])

        Routes.group('books', () => {
            Routes.get('', [contactController, 'getBooks'])
            Routes.post('', [contactController, 'saveBook'])
            Routes.delete(':id', [contactController, 'deleteBook'])

            // Book Contacts
            Routes.post(':id/contacts', [contactController, 'addBookContact'])
            Routes.post(':id/contacts/bulk', [contactController, 'bulkAddBookContacts'])
            Routes.delete(':id/contacts/:phone', [contactController, 'removeBookContact'])
            Routes.put(':id/contacts/:phone', [contactController, 'updateBookContact'])
        })
    }, [authMiddleware])

    // Template Routes
    Routes.group('templates', () => {
        Routes.post('', [templateController, 'create'])
        Routes.get('', [templateController, 'getAll'])
        Routes.get(':token', [templateController, 'getOne'])
        Routes.put(':token', [templateController, 'update'])
        Routes.delete(':token', [templateController, 'delete'])
    }, [authMiddleware])

    // Auto-reply Routes
    Routes.group('auto-replies', () => {
        Routes.get('stats', [autoReplyController, 'getStats'])
        Routes.post('', [autoReplyController, 'create'])
        Routes.get('', [autoReplyController, 'getAll'])
        Routes.put(':token', [autoReplyController, 'update'])
        Routes.delete(':token', [autoReplyController, 'delete'])
    }, [authMiddleware])

    // Campaign Routes
    Routes.group('campaigns', () => {
        Routes.get('stats', [campaignController, 'getStats'])
        Routes.post('', [campaignController, 'create'], [subscriptionMiddleware('messages')])
        Routes.get('', [campaignController, 'getAll'])
        Routes.get(':token', [campaignController, 'getOne'])
        Routes.delete(':token', [campaignController, 'delete'])
    }, [authMiddleware])

    // Scheduled Message Routes
    Routes.group('scheduled-messages', () => {
        Routes.post('', [scheduledMessageController, 'create'], [subscriptionMiddleware('messages')])
        Routes.get('stats', [scheduledMessageController, 'getStats'])
        Routes.get('', [scheduledMessageController, 'getAll'])
        Routes.get(':token', [scheduledMessageController, 'getOne'])
        Routes.put(':token/cancel', [scheduledMessageController, 'cancel'])
        Routes.delete(':token', [scheduledMessageController, 'delete'])
    }, [authMiddleware])

    Routes.group('webhooks', () => {
        Routes.get('', [webhookController, 'getAll'])
        Routes.post('', [webhookController, 'save'])
        Routes.delete(':token', [webhookController, 'delete'])
    }, [authMiddleware])

    // API Key Routes
    Routes.group('keys', () => {
        Routes.get('', [apiKeyController, 'getAll'])
        Routes.post('', [apiKeyController, 'create'], [subscriptionMiddleware('api_keys')])
        Routes.delete(':token', [apiKeyController, 'delete'])
    }, [authMiddleware])

    // Dashboard Route
    Routes.get('dashboard', [dashboardController, 'getOverview'], [authMiddleware])

    // Settings Routes
    Routes.group('settings', () => {
        Routes.get('profile', [settingsController, 'getProfile'])
        Routes.put('profile', [settingsController, 'updateProfile'])
        Routes.put('', [settingsController, 'updateSettings'])
    }, [authMiddleware])

    // DataTable Routes (Server-Side Rendering)
    Routes.group('datatable', () => {
        Routes.post('history', [datatableController, 'getHistoryDataTable'])
        Routes.post('contacts', [datatableController, 'getContactsDataTable'])
        Routes.post('campaigns', [datatableController, 'getCampaignsDataTable'])
        Routes.post('scheduled-messages', [datatableController, 'getScheduledMessagesDataTable'])
        Routes.post('api-keys', [datatableController, 'getApiKeysDataTable'])
        Routes.post('webhooks', [datatableController, 'getWebhooksDataTable'])
        Routes.post('device-users', [datatableController, 'getDeviceUsersDataTable'])
        Routes.post('contacts/book-members', [datatableController, 'getBookMembersDataTable'])
        Routes.post('number-checker', [datatableController, 'getNumberCheckDataTable'])
    }, [authMiddleware])

    // Admin Routes
    Routes.group('admin', () => {
        // Admin DataTable Routes
        Routes.post('datatable/users', [datatableController, 'getUsersDataTable'])
        Routes.get('users/stats', [adminController, 'getUserStats'])

        Routes.group('users', () => {
            Routes.post('', [adminController, 'createUserData'])
            Routes.get(':token', [adminController, 'getUserData'])
            Routes.put(':token', [adminController, 'updateUserData'])
            Routes.put(':token/status', [adminController, 'toggleUserStatus'])
            Routes.delete(':token', [adminController, 'deleteUser'])
        })

        Routes.group('packages', () => {
            Routes.post('', [adminController, 'savePackage'])
            Routes.put(':id', [adminController, 'updatePackage'])
            Routes.delete(':id', [adminController, 'deletePackage'])
        })

        Routes.group('settings', () => {
            Routes.post('', [adminController, 'updateSettings'])
        })
    }, [authMiddleware, adminMiddleware()])
})
