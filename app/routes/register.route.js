'use strict'

const Routes = require('@refkinscallv/express-routing')

// Load routes
require('./web.route')
require('./api.route')

module.exports = {
    register: (app) => {
        Routes.apply(app)
    },
}
