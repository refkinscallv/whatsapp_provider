'use strict'

const Routes = require('@refkinscallv/express-routing')
const WebController = require('@app/http/controllers/web.controller')
const AdminController = require('@app/http/controllers/admin.controller')
const authMiddleware = require('@app/http/middlewares/auth.middleware')
const guestMiddleware = require('@app/http/middlewares/guest.middleware')
const adminMiddleware = require('@app/http/middlewares/admin.middleware')
const webMiddleware = require('@app/http/middlewares/web.middleware')

/**
 * Web Routes
 * Handles all browser-based routes (EJS views)
 */
Routes.group('', () => {
    // Guest Routes
    Routes.get('/', [WebController, 'landing'])
    Routes.get('login', [WebController, 'login'], [guestMiddleware])
    Routes.get('register', [WebController, 'register'], [guestMiddleware])
    Routes.get('pricing', [WebController, 'pricing'], [guestMiddleware])
    Routes.get('forgot-password', [WebController, 'forgotPassword'], [guestMiddleware])
    Routes.get('reset-password', [WebController, 'resetPassword'], [guestMiddleware])
    Routes.get('about', [WebController, 'about'])
    Routes.get('contact', [WebController, 'contact'])
    Routes.get('privacy', [WebController, 'privacy'])
    Routes.get('tos', [WebController, 'tos'])
    Routes.get('cookies', [WebController, 'cookies'])

    // Protected Routes
    Routes.group('', () => {
        Routes.get('dashboard', [WebController, 'dashboard'])
        Routes.get('devices', [WebController, 'devices'])
        Routes.get('messaging', [WebController, 'messaging'])
        Routes.get('campaigns', [WebController, 'campaigns'])
        Routes.get('scheduled-messages', [WebController, 'scheduledMessages'])
        Routes.get('contacts', [WebController, 'contacts'])
        Routes.get('templates', [WebController, 'templates'])
        Routes.get('auto-replies', [WebController, 'autoReplies'])
        Routes.get('settings', [WebController, 'settings'])
        Routes.get('billing', [WebController, 'billing'])

        // Tools
        Routes.get('tools/number-checker', [WebController, 'toolsNumberChecker'])

        // Admin Routes
        Routes.group('admin', () => {
            Routes.get('/', [AdminController, 'dashboard'])
            Routes.get('users', [AdminController, 'users'])
            Routes.get('packages', [AdminController, 'packages'])
            Routes.get('billing', [AdminController, 'billing'])
            Routes.get('settings', [AdminController, 'settings'])
        }, [adminMiddleware()])

        // Placeholder for history (can reuse dashboard or create dedicated)
        Routes.get('history', [WebController, 'history'])
        Routes.get('api-docs', [WebController, 'docs'])
    }, [authMiddleware])
}, [webMiddleware])
