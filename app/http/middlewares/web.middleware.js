'use strict'

const appModeService = require('@app/services/appMode.service')

/**
 * Web Middleware
 * Provides common locals to all web views
 */
module.exports = async (arg1, arg2, arg3) => {
    let req, res, next
    if (arg1 && arg1.req && arg1.res && arg1.next) {
        req = arg1.req
        res = arg1.res
        next = arg1.next
    } else {
        req = arg1
        res = arg2
        next = arg3
    }

    try {
        const isSubscriptionEnabled = await appModeService.isSubscriptionEnabled()
        const appMode = await appModeService.getMode()

        res.locals.isSubscriptionEnabled = isSubscriptionEnabled
        res.locals.appMode = appMode

        // Redirect from landing to dashboard if in DASHBOARD mode
        if (appMode === 'DASHBOARD' && req.path === '/') {
            return res.redirect('/dashboard')
        }

        next()
    } catch (err) {
        next(err)
    }
}
