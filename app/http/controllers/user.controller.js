// CONTROLLER SAMPLE
// 'use strict'

// const UserService = require('@app/services/user.service')
// const UserValidator = require('@app/http/validators/user.validator')
// const BaseController = require('@app/http/controllers/base.controller')

// module.exports = class UserController extends BaseController {
//     static async get({ req, res }) {
//         const validation = UserValidator.validate('get', req.params)
//         if (!validation.success) {
//             return this.json(res, false, 422, validation.error)
//         }
        
//         return this.json(await this.UserService.get(req.params.token))
//     }
    
//     static async datatable(req, res) {
//         // Validate query parameters
//         const validation = UserValidator.validate('datatable', req.query)
//         if (!validation.success) {
//             return this.json(res, false, 422, validation.error)
//         }

//         // Update req.query with validated data
//         req.query = validation.data

//         const result = await UserService.datatable(req)
        
//         return res.status(result.code).json(result)
//     }

//     /**
//      * Get all users with filters
//      * GET /api/users
//      */
//     static async getAll(req, res) {
//         // Validate query filters
//         const validation = UserValidator.validate('getAll', req.query)
        
//         if (!validation.success) {
//             return res.status(400).json({
//                 success: false,
//                 message: validation.error,
//                 errors: validation.errors
//             })
//         }

//         const result = await UserService.getAll(validation.data || {})
        
//         return res.status(result.code).json(result)
//     }

//     /**
//      * Create new user
//      * POST /api/users
//      */
//     static async store(req, res) {
//         // Validate body
//         const bodyValidation = UserValidator.validate('store', req.body)
        
//         if (!bodyValidation.success) {
//             return res.status(400).json({
//                 success: false,
//                 message: bodyValidation.error,
//                 errors: bodyValidation.errors
//             })
//         }

//         // Validate avatar if exists
//         if (req.files?.avatar) {
//             const avatarValidation = UserValidator.validateAvatar(req.files.avatar)
            
//             if (!avatarValidation.success) {
//                 return res.status(400).json({
//                     success: false,
//                     message: avatarValidation.error,
//                     errors: avatarValidation.errors
//                 })
//             }
//         }

//         // Update req.body with validated data
//         req.body = bodyValidation.data

//         const result = await UserService.store(req)
        
//         return res.status(result.code).json(result)
//     }

//     /**
//      * Create new user (Alternative - Multiple validation)
//      * POST /api/users
//      */
//     static async storeAlt(req, res) {
//         // Validate multiple schemas at once
//         const validation = UserValidator.validateMultiple({
//             store: req.body,
//             ...(req.files?.avatar && { avatar: req.files.avatar })
//         })
        
//         if (!validation.success) {
//             return res.status(400).json({
//                 success: false,
//                 message: validation.error,
//                 errors: validation.errors
//             })
//         }

//         // Update req.body with validated data
//         req.body = validation.data.store

//         const result = await UserService.store(req)
        
//         return res.status(result.code).json(result)
//     }

//     /**
//      * Update user
//      * PUT /api/users/:token
//      */
//     static async update(req, res) {
//         // Combine params and body for validation
//         const dataToValidate = {
//             token: req.params.token,
//             ...req.body
//         }

//         // Validate
//         const validation = UserValidator.validate('update', dataToValidate)
        
//         if (!validation.success) {
//             return res.status(400).json({
//                 success: false,
//                 message: validation.error,
//                 errors: validation.errors
//             })
//         }

//         // Validate avatar if exists
//         if (req.files?.avatar) {
//             const avatarValidation = UserValidator.validateAvatar(req.files.avatar)
            
//             if (!avatarValidation.success) {
//                 return res.status(400).json({
//                     success: false,
//                     message: avatarValidation.error,
//                     errors: avatarValidation.errors
//                 })
//             }
//         }

//         // Extract token and body
//         const { token, ...body } = validation.data
//         req.body = body

//         const result = await UserService.update(token, req)
        
//         return res.status(result.code).json(result)
//     }

//     /**
//      * Delete user avatar
//      * DELETE /api/users/:token/avatar
//      */
//     static async deleteAvatar(req, res) {
//         // Validate params
//         const validation = UserValidator.validate('deleteAvatar', req.params)
        
//         if (!validation.success) {
//             return res.status(400).json({
//                 success: false,
//                 message: validation.error,
//                 errors: validation.errors
//             })
//         }

//         const result = await UserService.deleteAvatar(validation.data.token)
        
//         return res.status(result.code).json(result)
//     }

//     /**
//      * Delete user (hard delete)
//      * DELETE /api/users/:token
//      */
//     static async delete(req, res) {
//         // Validate params
//         const validation = UserValidator.validate('delete', req.params)
        
//         if (!validation.success) {
//             return res.status(400).json({
//                 success: false,
//                 message: validation.error,
//                 errors: validation.errors
//             })
//         }

//         const result = await UserService.delete(validation.data.token)
        
//         return res.status(result.code).json(result)
//     }

//     /**
//      * Soft delete user
//      * PATCH /api/users/:token/deactivate
//      */
//     static async softDelete(req, res) {
//         // Validate params
//         const validation = UserValidator.validate('softDelete', req.params)
        
//         if (!validation.success) {
//             return res.status(400).json({
//                 success: false,
//                 message: validation.error,
//                 errors: validation.errors
//             })
//         }

//         const result = await UserService.softDelete(validation.data.token)
        
//         return res.status(result.code).json(result)
//     }
// }
