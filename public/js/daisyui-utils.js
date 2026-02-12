/**
 * DaisyUI Component Utilities
 * Helper functions untuk komponen UI standar
 * 
 * @version 1.0.0
 * @author WhatsApp Provider Team
 */

/**
 * Standard DaisyUI Classes
 * Kumpulan class standar yang digunakan di seluruh aplikasi
 */
const DaisyUIClasses = {
    // Form Elements
    input: {
        base: 'input input-bordered w-full rounded-2xl',
        small: 'input input-bordered input-sm w-full rounded-xl',
        withIcon: 'input input-bordered w-full rounded-2xl pl-10',
    },

    select: {
        base: 'select select-bordered w-full rounded-2xl',
        small: 'select select-bordered select-sm w-full rounded-xl',
        extraSmall: 'select select-bordered select-xs rounded-lg',
    },

    textarea: {
        base: 'textarea textarea-bordered w-full rounded-2xl',
    },

    label: {
        base: 'block mb-2 uppercase text-[11px] font-semibold tracking-widest opacity-60',
        inline: 'label cursor-pointer justify-start gap-4',
    },

    checkbox: {
        base: 'checkbox checkbox-primary',
        small: 'checkbox checkbox-primary checkbox-sm',
    },

    // Buttons
    button: {
        primary: 'btn btn-primary rounded-xl',
        ghost: 'btn btn-ghost',
        error: 'btn btn-error btn-outline rounded-xl',
        small: 'btn btn-sm rounded-lg',
    },

    // Cards
    card: {
        base: 'card glass shadow-sm',
        hover: 'card glass hover:shadow-xl transition-all border border-base-content/10 group',
    },

    // Tables
    table: {
        base: 'table table-lg w-full',
        small: 'table table-sm w-full',
        medium: 'table table-md w-full',
        header: 'text-base-content/60 uppercase text-[10px] tracking-widest border-b-2 border-base-content/5',
        headerSticky: 'text-base-content/60 uppercase text-[10px] tracking-widest border-b-2 border-base-content/5 sticky top-0 bg-base-100 z-10',
        row: 'hover:bg-base-200/50',
    },

    // Modal
    modal: {
        box: 'modal-box bg-base-100 border border-base-content/5',
        boxLarge: 'modal-box w-11/12 max-w-4xl bg-base-100 border border-base-content/5 rounded-3xl p-0 overflow-hidden',
        boxScroll: 'modal-box bg-base-100 border border-base-content/5 max-w-4xl h-[80vh] flex flex-col',
        title: 'font-bold text-lg mb-4 text-base-content',
    },

    // Badges
    badge: {
        primary: 'badge badge-primary badge-xs',
        ghost: 'badge badge-ghost badge-xs',
        outline: 'badge badge-outline badge-sm rounded-lg py-3 px-4 font-bold tracking-widest text-[10px] uppercase',
    },
};

/**
 * Apply DataTable Standard Styling
 * Fungsi untuk styling DataTable dengan DaisyUI
 * 
 * @example
 * $('#table-id').DataTable({ ... });
 * applyDataTableStyling();
 */
function applyDataTableStyling() {
    $('.dataTables_length select').addClass('select select-bordered select-xs rounded-lg mx-2');
    $('.dataTables_paginate').addClass('btn-group mt-4 flex justify-end gap-1');
    $('.dataTables_info').addClass('text-xs opacity-50 mt-4');
    $('.dataTables_filter input').addClass('input input-bordered input-sm rounded-xl mb-4 bg-base-200/50 min-w-[300px]');
    $('.paginate_button').addClass('btn btn-xs btn-ghost rounded-lg');
    $('.paginate_button.current').addClass('btn-primary text-white pointer-events-none');
}

/**
 * Create Form Control with Label
 * Helper untuk membuat form control dengan label standar
 * 
 * @param {string} id - ID untuk input element
 * @param {string} label - Text label
 * @param {string} type - Type input (text, email, password, dll)
 * @param {string} placeholder - Placeholder text
 * @param {boolean} required - Apakah field required
 * @returns {string} HTML string
 * 
 * @example
 * const html = createFormControl('userName', 'Nama Lengkap', 'text', 'Masukkan nama...', true);
 */
function createFormControl(id, label, type = 'text', placeholder = '', required = false) {
    return `
        <div class="form-control">
            <label class="${DaisyUIClasses.label.base}">
                ${label}
            </label>
            <input 
                type="${type}" 
                id="${id}" 
                class="${DaisyUIClasses.input.base}" 
                placeholder="${placeholder}"
                ${required ? 'required' : ''}
            />
        </div>
    `;
}

/**
 * Create Select Control with Label
 * Helper untuk membuat select control dengan label standar
 * 
 * @param {string} id - ID untuk select element
 * @param {string} label - Text label
 * @param {Array} options - Array of {value, text} objects
 * @param {boolean} required - Apakah field required
 * @returns {string} HTML string
 * 
 * @example
 * const html = createSelectControl('device', 'Pilih Device', [
 *     {value: '1', text: 'Device 1'},
 *     {value: '2', text: 'Device 2'}
 * ], true);
 */
function createSelectControl(id, label, options = [], required = false) {
    const optionsHtml = options.map(opt =>
        `<option value="${opt.value}">${opt.text}</option>`
    ).join('');

    return `
        <div class="form-control">
            <label class="${DaisyUIClasses.label.base}">
                ${label}
            </label>
            <select 
                id="${id}" 
                class="${DaisyUIClasses.select.base}"
                ${required ? 'required' : ''}
            >
                ${optionsHtml}
            </select>
        </div>
    `;
}

/**
 * Create Textarea Control with Label
 * Helper untuk membuat textarea control dengan label standar
 * 
 * @param {string} id - ID untuk textarea element
 * @param {string} label - Text label
 * @param {number} rows - Jumlah baris
 * @param {string} placeholder - Placeholder text
 * @param {boolean} required - Apakah field required
 * @returns {string} HTML string
 * 
 * @example
 * const html = createTextareaControl('message', 'Pesan', 4, 'Tulis pesan...', true);
 */
function createTextareaControl(id, label, rows = 4, placeholder = '', required = false) {
    return `
        <div class="form-control">
            <label class="${DaisyUIClasses.label.base}">
                ${label}
            </label>
            <textarea 
                id="${id}" 
                class="${DaisyUIClasses.textarea.base}" 
                rows="${rows}"
                placeholder="${placeholder}"
                ${required ? 'required' : ''}
            ></textarea>
        </div>
    `;
}

/**
 * Show Standard Modal
 * Helper untuk menampilkan modal dengan struktur standar
 * 
 * @param {string} modalId - ID modal element
 * 
 * @example
 * showModal('modal_example');
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && typeof modal.showModal === 'function') {
        modal.showModal();
    }
}

/**
 * Close Standard Modal
 * Helper untuk menutup modal
 * 
 * @param {string} modalId - ID modal element
 * 
 * @example
 * closeModal('modal_example');
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && typeof modal.close === 'function') {
        modal.close();
    }
}

/**
 * Initialize DataTable with Standard Config
 * Helper untuk inisialisasi DataTable dengan konfigurasi standar
 * 
 * @param {string} tableId - ID table element
 * @param {Object} customConfig - Konfigurasi tambahan (opsional)
 * @returns {Object} DataTable instance
 * 
 * @example
 * const table = initDataTable('users-table', {
 *     pageLength: 50,
 *     order: [[1, 'asc']]
 * });
 */
function initDataTable(tableId, customConfig = {}) {
    const defaultConfig = {
        pageLength: 25,
        lengthMenu: [10, 25, 50, 100],
        order: [[0, 'desc']],
        language: {
            search: "",
            searchPlaceholder: "Cari...",
            lengthMenu: "_MENU_ per halaman",
            emptyTable: "Tidak ada data",
            zeroRecords: "Tidak ditemukan data yang cocok"
        }
    };

    const config = { ...defaultConfig, ...customConfig };
    const table = $(`#${tableId}`).DataTable(config);

    // Apply standard styling
    applyDataTableStyling();

    return table;
}

/**
 * Create Table Header Cell
 * Helper untuk membuat header cell dengan styling standar
 * 
 * @param {string} text - Text header
 * @param {string} align - Alignment (left, center, right)
 * @returns {string} HTML string
 * 
 * @example
 * const html = createTableHeader('Nama', 'left');
 */
function createTableHeader(text, align = 'left') {
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : '';
    return `<th class="${alignClass}">${text}</th>`;
}

// Export untuk digunakan di file lain (jika menggunakan module system)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DaisyUIClasses,
        applyDataTableStyling,
        createFormControl,
        createSelectControl,
        createTextareaControl,
        showModal,
        closeModal,
        initDataTable,
        createTableHeader
    };
}

// Global access (untuk digunakan langsung di browser)
window.DaisyUIUtils = {
    Classes: DaisyUIClasses,
    applyDataTableStyling,
    createFormControl,
    createSelectControl,
    createTextareaControl,
    showModal,
    closeModal,
    initDataTable,
    createTableHeader
};
