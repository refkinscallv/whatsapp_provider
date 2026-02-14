/**
 * DataTable Helper Utilities
 * Shared functions for initializing and managing server-side DataTables
 */

const DataTableHelper = {
    /**
     * Initialize server-side DataTable
     * @param {String} tableId - Table element ID
     * @param {String} ajaxUrl - API endpoint URL
     * @param {Array} columns - DataTable columns configuration
     * @param {Object} customOptions - Additional DataTable options
     * @returns {Object} DataTable instance
     */
    initServerSideDataTable(tableId, ajaxUrl, columns, customOptions = {}) {
        try {
            const defaultOptions = {
                processing: true,
                serverSide: true,
                ajax: {
                    url: ajaxUrl,
                    type: 'POST',
                    data: function (d) {
                        // Add custom filters from modal
                        const filters = DataTableHelper.getActiveFilters(tableId);
                        const extraParams = window[`dt_params_${tableId}`] || {};
                        return $.extend({}, d, filters, extraParams);
                    },
                    error: function (xhr, error, code) {
                        console.error('DataTable AJAX error:', error, code);
                        showToast.error('Failed to load data', 'Error');
                    }
                },
                columns: columns,
                pageLength: 10,
                lengthMenu: [10, 25, 50, 100],
                order: [[0, 'desc']],
                language: {
                    processing: '<span class="loading loading-spinner loading-lg text-primary"></span>',
                    search: "",
                    searchPlaceholder: "Search...",
                    lengthMenu: "_MENU_ per page",
                    info: "Showing _START_ to _END_ of _TOTAL_ entries",
                    infoEmpty: "No entries available",
                    infoFiltered: "(filtered from _MAX_ total entries)",
                    zeroRecords: "No matching records found",
                    emptyTable: "No data available in table",
                    paginate: {
                        first: "First",
                        last: "Last",
                        next: "Next",
                        previous: "Previous"
                    }
                },
                drawCallback: function () {
                    DataTableHelper.applyDaisyUIStyling(tableId);
                }
            };

            // Store initial ajaxParams if provided
            if (customOptions.ajaxParams) {
                window[`dt_params_${tableId}`] = customOptions.ajaxParams;
            }

            const options = $.extend(true, {}, defaultOptions, customOptions);
            const table = $(`#${tableId}`).DataTable(options);

            // Store table instance for later use
            window[`dt_${tableId}`] = table;

            // Apply initial styling
            DataTableHelper.applyDaisyUIStyling(tableId);

            return table;
        } catch (err) {
            console.error(`[DataTableHelper] Initialization failed for #${tableId}:`, err);
            throw err;
        }
    },

    /**
     * Alias for initServerSideDataTable
     */
    init(tableId, ajaxUrl, columns, customOptions = {}) {
        return this.initServerSideDataTable(tableId, ajaxUrl, columns, customOptions);
    },

    /**
     * Apply DaisyUI styling to DataTable elements
     * @param {String} tableId - Table element ID
     */
    applyDaisyUIStyling(tableId) {
        // Style length select
        $('.dataTables_length select').addClass('select select-bordered select-xs rounded-lg mx-2');

        // Style search input
        $('.dataTables_filter input').addClass('input input-bordered input-sm rounded-xl bg-base-200/50 min-w-[250px]');

        // Style pagination
        $('.dataTables_paginate').addClass('btn-group mt-4 flex justify-end gap-1');
        $('.paginate_button').addClass('btn btn-xs btn-ghost rounded-lg');
        $('.paginate_button.current').addClass('btn-primary text-white pointer-events-none');
        $('.paginate_button.disabled').addClass('btn-disabled opacity-30');

        // Style info
        $('.dataTables_info').addClass('text-xs opacity-50 mt-4');

        // Style processing indicator
        $('.dataTables_processing').addClass('bg-base-100/90 backdrop-blur-sm rounded-xl p-6 shadow border border-base-content/10');
    },

    /**
     * Get active filters from filter form
     * @param {String} tableId - Table element ID
     * @returns {Object} Filter object
     */
    getActiveFilters(tableId) {
        const formId = `filter_form_${tableId.replace('-table', '')}`;
        const form = document.getElementById(formId);

        if (!form) return {};

        const filters = {};
        const formData = new FormData(form);

        for (let [key, value] of formData.entries()) {
            if (value !== '' && value !== null) {
                filters[key] = value;
            }
        }

        return filters;
    },

    /**
     * Open filter modal
     * @param {String} modalId - Modal element ID
     * @param {String} tableId - Table element ID
     */
    openFilterModal(modalId, tableId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.showModal();
        }
    },

    /**
     * Apply filters and reload table
     * @param {String} tableId - Table element ID
     * @param {String} modalId - Modal element ID (optional, to close after apply)
     */
    applyFilters(tableId, modalId = null) {
        const table = window[`dt_${tableId}`];
        if (table) {
            table.ajax.reload();
        }

        if (modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.close();
            }
        }

        showToast.success('Filters applied', 'Success');
    },

    /**
     * Reset filters and reload table
     * @param {String} formId - Filter form ID
     * @param {String} tableId - Table element ID
     * @param {String} modalId - Modal element ID (optional, to close after reset)
     */
    resetFilters(formId, tableId, modalId = null) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }

        const table = window[`dt_${tableId}`];
        if (table) {
            table.ajax.reload();
        }

        if (modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.close();
            }
        }

        showToast.info('Filters reset', 'Reset');
    },

    /**
     * Reload table data
     * @param {String} tableId - Table element ID
     * @param {Object} newParams - Optional new AJAX parameters to merge
     */
    reloadTable(tableId, newParams = null) {
        if (newParams) {
            window[`dt_params_${tableId}`] = $.extend({}, window[`dt_params_${tableId}`] || {}, newParams);
        }
        const table = window[`dt_${tableId}`];
        if (table) {
            table.ajax.reload(null, false); // false = stay on current page
        }
    },

    /**
     * Destroy table instance
     * @param {String} tableId - Table element ID
     */
    destroyTable(tableId) {
        const table = window[`dt_${tableId}`];
        if (table) {
            table.destroy();
            delete window[`dt_${tableId}`];
        }
    }
};

// Make available globally
window.DataTableHelper = DataTableHelper;
