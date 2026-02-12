// VALIDATOR SAMPLE
// 'use strict'

// const { z } = require('zod')

// module.exports = class UserValidator {
//     /**
//      * Schema definitions
//      * @private
//      */
//     static #schemas = {
//         // Get user by token
//         get: z.object({
//             token: z.string()
//                 .min(32, 'Token must be 32 characters')
//                 .max(32, 'Token must be 32 characters')
//         }),

//         // Store new user
//         store: z.object({
//             name: z.string()
//                 .min(3, 'Name must be at least 3 characters')
//                 .max(100, 'Name must not exceed 100 characters'),
            
//             username: z.string()
//                 .min(8, 'Username must be at least 8 characters')
//                 .max(50, 'Username must not exceed 50 characters')
//                 .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
            
//             password: z.string()
//                 .min(8, 'Password must be at least 8 characters')
//                 .max(100, 'Password must not exceed 100 characters'),
            
//             gender: z.enum(['male', 'female'], {
//                 errorMap: () => ({ message: 'Gender must be either male or female' })
//             }).optional(),
            
//             bio: z.string()
//                 .max(500, 'Bio must not exceed 500 characters')
//                 .optional(),
            
//             status: z.enum(['active', 'inactive'], {
//                 errorMap: () => ({ message: 'Status must be either active or inactive' })
//             }).optional(),
            
//             is_admin: z.union([
//                 z.boolean(),
//                 z.string().transform(val => val === '1' || val === 'true'),
//                 z.literal('0').transform(() => false),
//                 z.literal('1').transform(() => true)
//             ]).optional()
//         }),

//         // Update user
//         update: z.object({
//             token: z.string()
//                 .min(32, 'Token must be 32 characters')
//                 .max(32, 'Token must be 32 characters'),
            
//             name: z.string()
//                 .min(3, 'Name must be at least 3 characters')
//                 .max(100, 'Name must not exceed 100 characters')
//                 .optional(),
            
//             username: z.string()
//                 .min(8, 'Username must be at least 8 characters')
//                 .max(50, 'Username must not exceed 50 characters')
//                 .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
//                 .optional(),
            
//             password: z.string()
//                 .min(8, 'Password must be at least 8 characters')
//                 .max(100, 'Password must not exceed 100 characters')
//                 .optional(),
            
//             gender: z.enum(['male', 'female'], {
//                 errorMap: () => ({ message: 'Gender must be either male or female' })
//             }).optional(),
            
//             bio: z.string()
//                 .max(500, 'Bio must not exceed 500 characters')
//                 .optional(),
            
//             status: z.enum(['active', 'inactive'], {
//                 errorMap: () => ({ message: 'Status must be either active or inactive' })
//             }).optional(),
            
//             is_admin: z.union([
//                 z.boolean(),
//                 z.string().transform(val => val === '1' || val === 'true'),
//                 z.literal('0').transform(() => false),
//                 z.literal('1').transform(() => true)
//             ]).optional()
//         }).refine(data => {
//             const { token, ...rest } = data
//             return Object.keys(rest).length > 0
//         }, {
//             message: 'At least one field must be provided for update'
//         }),

//         // Delete user
//         delete: z.object({
//             token: z.string()
//                 .min(32, 'Token must be 32 characters')
//                 .max(32, 'Token must be 32 characters')
//         }),

//         // Soft delete user
//         softDelete: z.object({
//             token: z.string()
//                 .min(32, 'Token must be 32 characters')
//                 .max(32, 'Token must be 32 characters')
//         }),

//         // Delete avatar
//         deleteAvatar: z.object({
//             token: z.string()
//                 .min(32, 'Token must be 32 characters')
//                 .max(32, 'Token must be 32 characters')
//         }),

//         // Datatable pagination
//         datatable: z.object({
//             draw: z.string().optional().transform(val => val ? parseInt(val) : 1),
//             start: z.string().optional().transform(val => val ? parseInt(val) : 0),
//             length: z.string().optional().transform(val => val ? parseInt(val) : 10),
//             search: z.object({
//                 value: z.string().optional().default('')
//             }).optional(),
//             order: z.array(z.object({
//                 column: z.string().transform(val => parseInt(val)),
//                 dir: z.enum(['asc', 'desc'])
//             })).optional()
//         }),

//         // Get all users with filters
//         getAll: z.object({
//             status: z.enum(['active', 'inactive']).optional(),
//             is_admin: z.union([
//                 z.boolean(),
//                 z.string().transform(val => val === '1' || val === 'true')
//             ]).optional(),
//             gender: z.enum(['male', 'female']).optional()
//         }).optional(),

//         // Avatar upload validation
//         avatar: z.object({
//             name: z.string(),
//             size: z.number().max(5 * 1024 * 1024, 'Avatar size must not exceed 5MB'),
//             mimetype: z.string().refine(
//                 (mime) => ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(mime),
//                 { message: 'Avatar must be a valid image file (JPEG, PNG, GIF, WEBP)' }
//             )
//         })
//     }

//     /**
//      * Validate data against schema
//      * @param {string} schema - Schema name (get, store, update, delete, etc.)
//      * @param {Object} data - Data to validate
//      * @returns {Object} Validation result { success: boolean, data?: any, error?: string, errors?: array }
//      */
//     static validate(schema, data) {
//         try {
//             // Check if schema exists
//             if (!this.#schemas[schema]) {
//                 return {
//                     success: false,
//                     error: `Schema '${schema}' not found`,
//                     errors: [{ field: 'schema', message: `Schema '${schema}' not found` }]
//                 }
//             }

//             // Validate data
//             const result = this.#schemas[schema].safeParse(data)

//             if (!result.success) {
//                 // Format zod errors
//                 const errors = result.error.errors.map(err => ({
//                     field: err.path.join('.') || 'unknown',
//                     message: err.message
//                 }))

//                 return {
//                     success: false,
//                     error: errors[0].message, // First error message
//                     errors // All errors
//                 }
//             }

//             return {
//                 success: true,
//                 data: result.data
//             }
//         } catch (e) {
//             return {
//                 success: false,
//                 error: 'Validation error occurred',
//                 errors: [{ field: 'unknown', message: e.message }]
//             }
//         }
//     }

//     /**
//      * Validate avatar file
//      * @param {Object} file - File object from express-fileupload
//      * @returns {Object} Validation result
//      */
//     static validateAvatar(file) {
//         if (!file) {
//             return {
//                 success: false,
//                 error: 'Avatar file is required',
//                 errors: [{ field: 'avatar', message: 'Avatar file is required' }]
//             }
//         }

//         return this.validate('avatar', {
//             name: file.name,
//             size: file.size,
//             mimetype: file.mimetype
//         })
//     }

//     /**
//      * Validate multiple fields at once
//      * @param {Object} validations - Object with schema names as keys and data as values
//      * @returns {Object} Combined validation result
//      * 
//      * @example
//      * UserValidator.validateMultiple({
//      *   store: req.body,
//      *   avatar: req.files?.avatar
//      * })
//      */
//     static validateMultiple(validations) {
//         const results = {}
//         const allErrors = []

//         for (const [schema, data] of Object.entries(validations)) {
//             const result = schema === 'avatar' 
//                 ? this.validateAvatar(data)
//                 : this.validate(schema, data)

//             results[schema] = result

//             if (!result.success) {
//                 allErrors.push(...result.errors)
//             }
//         }

//         const success = Object.values(results).every(r => r.success)

//         return {
//             success,
//             results,
//             error: allErrors[0]?.message,
//             errors: allErrors,
//             data: success ? Object.fromEntries(
//                 Object.entries(results).map(([key, val]) => [key, val.data])
//             ) : undefined
//         }
//     }

//     /**
//      * Get schema definition (useful for documentation)
//      * @param {string} schema - Schema name
//      * @returns {Object|null} Schema definition or null
//      */
//     static getSchema(schema) {
//         return this.#schemas[schema] || null
//     }

//     /**
//      * Get all available schemas
//      * @returns {Array<string>} List of schema names
//      */
//     static getSchemas() {
//         return Object.keys(this.#schemas)
//     }
// }
