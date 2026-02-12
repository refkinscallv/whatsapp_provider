'use strict'

module.exports = class BaseService
{
    static json(status = true, code = 200, message = '', data = {}, custom = {})
    {
        return { status, code, message, data, custom }
    }
}
