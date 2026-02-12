'use strict'

module.exports = class BaseController {
    static json(res, statusOrOutput, code = 200, message = '', data = {}, custom = {}) {
        let response = {}

        if (typeof statusOrOutput === 'object' && statusOrOutput !== null) {
            const serviceOutput = statusOrOutput
            
            response = {
                status: serviceOutput.status ?? true,
                code: serviceOutput.code ?? 200,
                message: serviceOutput.message ?? '',
                data: serviceOutput.data ?? {},
                ...serviceOutput.custom
            }

            return res.status(serviceOutput.code ?? 200).json(response)
        }

        response = {
            status: statusOrOutput ?? true,
            code: code ?? 200,
            message: message ?? '',
            data: data ?? {},
            ...custom
        }

        return res.status(code ?? 200).json(response)
    }
    
    static success(res, message = 'Success', data = {}, code = 200) {
        return this.json(res, true, code, message, data)
    }

    static error(res, message = 'Error', code = 400, data = {}) {
        return this.json(res, false, code, message, data)
    }
    
    static validationError(res, validation) {
        return this.json(res, false, 400, validation.error, {}, {
            errors: validation.errors
        })
    }
    
    static notFound(res, message = 'Resource not found') {
        return this.json(res, false, 404, message)
    }
    
    static unauthorized(res, message = 'Unauthorized') {
        return this.json(res, false, 401, message)
    }
    
    static forbidden(res, message = 'Forbidden') {
        return this.json(res, false, 403, message)
    }
    
    static serverError(res, message = 'Internal server error') {
        return this.json(res, false, 500, message)
    }
    
    static created(res, message = 'Created successfully', data = {}) {
        return this.json(res, true, 201, message, data)
    }
    
    static noContent(res) {
        return res.status(204).send()
    }
}
