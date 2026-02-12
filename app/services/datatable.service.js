'use strict'

const { Op } = require('sequelize')

class DataTableService {
    /**
     * Build server-side DataTable query
     * @param {Object} model - Sequelize model
     * @param {Object} params - DataTable parameters from request
     * @param {Object} options - Additional options (include, where, searchableColumns, etc)
     * @returns {Promise<Object>} DataTable response
     */
    async buildDataTableQuery(model, params, options = {}) {
        try {
            const {
                draw = 1,
                start = 0,
                length = 10,
                search = {},
                order = [],
                columns = []
            } = params

            const {
                include = [],
                where = {},
                searchableColumns = [],
                customFilters = {},
                defaultOrder = [['createdAt', 'DESC']]
            } = options

            // Build base query
            let queryOptions = {
                where: { ...where },
                include,
                distinct: true,
                subQuery: false
            }

            // Apply custom filters from modal
            if (customFilters && Object.keys(customFilters).length > 0) {
                queryOptions.where = {
                    ...queryOptions.where,
                    ...this.parseFilters(customFilters, model)
                }
            }

            // Apply global search
            if (search.value && searchableColumns.length > 0) {
                queryOptions.where = {
                    ...queryOptions.where,
                    ...this.applySearch(search.value, searchableColumns)
                }
            }

            // Get total records (before filtering)
            const recordsTotal = await model.count({
                where: { ...where }
            })

            // Get filtered records count
            const recordsFiltered = await model.count({
                where: queryOptions.where,
                include: queryOptions.include,
                distinct: true
            })

            // Apply ordering
            if (order && order.length > 0 && columns && columns.length > 0) {
                queryOptions.order = this.applyOrdering(order, columns, model)
            } else {
                // Ensure default order is also qualified if it's a simple string array
                queryOptions.order = defaultOrder.map(ord => {
                    if (Array.isArray(ord) && ord.length === 2 && typeof ord[0] === 'string' && !ord[0].includes('.')) {
                        // Use qualified column name with col() and explicit database field name to avoid ambiguity
                        const columnName = ord[0]
                        const fieldName = model.rawAttributes[columnName]?.field || columnName
                        return [model.sequelize.col(`${model.options.name.singular}.${fieldName}`), ord[1]]
                    }
                    return ord
                })
            }

            // Apply pagination
            if (parseInt(length) !== -1) {
                queryOptions.limit = parseInt(length)
                queryOptions.offset = parseInt(start)
            }

            // Execute query
            const data = await model.findAll(queryOptions)

            // Build response
            return this.buildResponse(data, recordsTotal, recordsFiltered, draw)
        } catch (error) {
            console.error('[DataTableService] Error:', error)
            throw error
        }
    }

    /**
     * Parse custom filters from modal
     * @param {Object} filters - Custom filters object
     * @param {Object} model - Sequelize model
     * @returns {Object} Sequelize where clause
     */
    parseFilters(filters, model) {
        const where = {}

        Object.keys(filters).forEach(key => {
            const value = filters[key]

            // Skip empty values
            if (value === null || value === undefined || value === '') {
                return
            }

            // Handle different filter types
            if (key.endsWith('_from') || key.endsWith('_to')) {
                // Date range filters
                const fieldName = key.replace(/_from$|_to$/, '')
                // Wrap in $ to ensure qualification
                const qualifiedKey = `$${fieldName}$`
                if (!where[qualifiedKey]) {
                    where[qualifiedKey] = {}
                }
                if (key.endsWith('_from')) {
                    where[qualifiedKey][Op.gte] = new Date(value)
                } else {
                    where[qualifiedKey][Op.lte] = new Date(value)
                }
            } else if (key.includes('->')) {
                // Handling JSON path filters (e.g., 'metadata->token' or 'MessageHistory.metadata->token')
                // MySQL requires JSON_EXTRACT + JSON_UNQUOTE for reliable string comparison
                const parts = key.split('->')
                const fullField = parts[0]
                const path = parts.slice(1).join('.') // Support nested paths

                // Use literal for the JSON expression to avoid double-escaping issues with $ in Sequelize
                // We resolve the column name manually to ensure compatibility with dots (Table.Column)
                const columnRef = fullField.includes('.')
                    ? `\`${fullField.split('.').join('`.`')}\``
                    : `\`${fullField}\``

                if (!where[Op.and]) where[Op.and] = []
                where[Op.and].push(model.sequelize.where(
                    model.sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(${columnRef}, '$.${path}'))`),
                    value
                ))
            } else if (Array.isArray(value)) {
                // Array filters (multiple select)
                where[`$${key}$`] = { [Op.in]: value }
            } else {
                // Exact match
                // Wrap in $ to ensure qualification, unless it already contains dots or $
                const qualifiedKey = (key.includes('.') || key.includes('$')) ? key : `$${key}$`
                where[qualifiedKey] = value
            }
        })

        return where
    }

    /**
     * Apply global search to query
     * @param {String} searchValue - Search term
     * @param {Array} searchableColumns - Columns to search in
     * @returns {Object} Sequelize where clause with OR conditions
     */
    applySearch(searchValue, searchableColumns) {
        if (!searchValue || searchableColumns.length === 0) {
            return {}
        }

        const searchConditions = searchableColumns.map(column => {
            // Handle nested columns (e.g., 'user.name')
            if (column.includes('.')) {
                const parts = column.split('.')
                return {
                    [`$${column}$`]: {
                        [Op.like]: `%${searchValue}%`
                    }
                }
            }

            return {
                [`$${column}$`]: {
                    [Op.like]: `%${searchValue}%`
                }
            }
        })

        return {
            [Op.or]: searchConditions
        }
    }

    /**
     * Apply ordering to query
     * @param {Array} orderParams - DataTable order parameters
     * @param {Array} columns - DataTable columns configuration
     * @param {Object} model - Sequelize model
     * @returns {Array} Sequelize order array
     */
    applyOrdering(orderParams, columns, model) {
        const order = []

        orderParams.forEach(orderParam => {
            const columnIndex = parseInt(orderParam.column)
            const direction = orderParam.dir === 'asc' ? 'ASC' : 'DESC'

            if (columns[columnIndex] && columns[columnIndex].data) {
                const columnName = columns[columnIndex].data

                // Handle nested columns for ordering
                if (columnName.includes('.')) {
                    const parts = columnName.split('.')
                    // For associations like 'user.name'
                    order.push([{ model: parts[0] }, parts[1], direction])
                } else {
                    // Use qualified column name with col() and explicit database field name to avoid ambiguity
                    const fieldName = model.rawAttributes[columnName]?.field || columnName
                    order.push([model.sequelize.col(`${model.options.name.singular}.${fieldName}`), direction])
                }
            }
        })

        const defaultField = model.rawAttributes['createdAt']?.field || 'createdAt'
        return order.length > 0 ? order : [[model.sequelize.col(`${model.options.name.singular}.${defaultField}`), 'DESC']]
    }

    /**
     * Build DataTable response
     * @param {Array} data - Query results
     * @param {Number} recordsTotal - Total records without filtering
     * @param {Number} recordsFiltered - Total records with filtering
     * @param {Number} draw - DataTable draw counter
     * @returns {Object} Formatted DataTable response
     */
    buildResponse(data, recordsTotal, recordsFiltered, draw) {
        return {
            draw: parseInt(draw) || 1,
            recordsTotal: parseInt(recordsTotal) || 0,
            recordsFiltered: parseInt(recordsFiltered) || 0,
            data: data.map(item => item.toJSON ? item.toJSON() : item)
        }
    }

    /**
     * Helper to build date range filter
     * @param {String} field - Field name
     * @param {String} from - Start date
     * @param {String} to - End date
     * @returns {Object} Sequelize where clause
     */
    buildDateRangeFilter(field, from, to) {
        const filter = {}

        if (from) {
            filter[Op.gte] = new Date(from)
        }

        if (to) {
            const toDate = new Date(to)
            toDate.setHours(23, 59, 59, 999) // End of day
            filter[Op.lte] = toDate
        }

        return Object.keys(filter).length > 0 ? { [field]: filter } : {}
    }
}

module.exports = new DataTableService()
