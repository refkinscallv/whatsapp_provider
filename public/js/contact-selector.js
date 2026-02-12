/**
 * Contact Selector Logic
 * Modular script to handle contact selection across different pages.
 */

let selectedContacts = new Set();
let currentContacts = [];
let targetInputSelector = null;

let pickerState = {
    offset: 0,
    limit: 20,
    isLoading: false,
    hasMore: true,
    sourceType: null, // 'book' or 'device'
    sourceId: null,
    searchQuery: ''
};

const _picker = {
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

async function openContactModal(targetInput) {
    targetInputSelector = targetInput;
    const modal = document.getElementById('modal_contacts');
    if (!modal) return;

    modal.showModal();
    loadBooksForPicker();

    // Event delegation for checkbox changes
    const list = $('#contact-list-picker');
    list.off('change').on('change', '.contact-checkbox', function () {
        toggleContactSelection(this.getAttribute('data-number'));
    });

    // Infinite Scroll Listener
    list.off('scroll').on('scroll', function () {
        if (this.scrollTop + this.clientHeight >= this.scrollHeight - 50) {
            if (pickerState.hasMore && !pickerState.isLoading && pickerState.sourceId) {
                loadMoreContacts();
            }
        }
    });

    // Debounced Search Listener
    $('#contact-search').off('input').on('input', _picker.debounce(function () {
        pickerState.searchQuery = $(this).val();
        if (pickerState.sourceId) {
            resetAndLoadContacts();
        }
    }, 500));
}

async function loadBooksForPicker() {
    const list = $('#book-list-picker');
    try {
        const [booksRes, devicesRes] = await Promise.all([
            axios.get('/api/contacts/books'),
            axios.get('/api/devices')
        ]);

        let html = '';

        // Device Sources
        if (devicesRes.data.success && devicesRes.data.devices?.length > 0) {
            html += '<p class="text-[10px] uppercase font-bold text-base-content/40 mb-3 px-2 mt-4">Synced from Devices</p>';
            html += devicesRes.data.devices.map(d => `
                <button onclick="selectContactSource('device', '${d.token}')"
                    class="btn btn-ghost btn-sm w-full justify-start text-left font-normal normal-case rounded-xl hover:bg-success/10 hover:text-success transition-all">
                    <i class="ri-smartphone-line text-lg"></i>
                    <span class="truncate">${d.name}</span>
                    <span class="badge badge-success badge-xs badge-outline ml-auto">${d.status}</span>
                </button>
            `).join('');
        }

        // Book Sources
        if (booksRes.data.success && booksRes.data.books?.length > 0) {
            html += '<p class="text-[10px] uppercase font-bold text-base-content/40 mb-3 px-2 mt-4">Manual Books</p>';
            html += booksRes.data.books.map(b => `
                <button onclick="selectContactSource('book', '${b.id}')"
                    class="btn btn-ghost btn-sm w-full justify-start text-left font-normal normal-case rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                    <i class="ri-book-3-line text-lg"></i>
                    <span class="truncate">${b.name}</span>
                    <span class="badge badge-ghost badge-xs opacity-50 ml-auto">${b.total_contacts || b.contacts?.length || 0}</span>
                </button>
            `).join('');
        }

        list.html(html || '<p class="text-xs opacity-40 text-center py-10">No contacts or books found</p>');

    } catch (err) {
        list.html('<p class="text-xs text-error p-4">Error loading sources</p>');
        console.error('Error loading contact books and devices:', err);
    }
}

function selectContactSource(type, id) {
    pickerState.sourceType = type;
    pickerState.sourceId = id;
    resetAndLoadContacts();
}

function resetAndLoadContacts() {
    pickerState.offset = 0;
    pickerState.hasMore = true;
    currentContacts = [];
    $('#contact-list-picker').scrollTop(0).empty(); // Clear list
    loadMoreContacts(true);
}

async function loadMoreContacts(isInitial = false) {
    if (pickerState.isLoading || !pickerState.hasMore) return;

    pickerState.isLoading = true;
    const list = $('#contact-list-picker');

    if (isInitial) {
        list.html('<p class="text-xs opacity-40 text-center py-20 loading-indicator">Loading contacts...</p>');
    } else {
        list.append('<div class="text-center py-2 loading-indicator"><span class="loading loading-spinner loading-xs"></span></div>');
    }

    try {
        const params = {
            limit: pickerState.limit,
            offset: pickerState.offset,
            search: pickerState.searchQuery
        };

        if (pickerState.sourceType === 'book') params.book_id = pickerState.sourceId;
        else params.device_token = pickerState.sourceId;

        const res = await axios.get('/api/contacts', { params });

        list.find('.loading-indicator').remove();

        if (res.data.success) {
            const rawContacts = Array.isArray(res.data.contacts) ? res.data.contacts : [];

            if (rawContacts.length < pickerState.limit) {
                pickerState.hasMore = false;
            }

            const newContacts = rawContacts.map(c => ({
                name: c.name || c.push_name || c.pushname || 'No Name',
                whatsapp: (c.phone || c.whatsapp || c.whatsapp_id?.split('@')[0] || '').toString().replace(/\D/g, '')
            })).filter(c => c.whatsapp);

            currentContacts = [...currentContacts, ...newContacts];
            pickerState.offset += pickerState.limit;

            const html = newContacts.map(c => `
                <label class="flex items-center gap-3 p-2 hover:bg-base-200/50 rounded-xl cursor-pointer transition-colors group">
                    <input type="checkbox" class="checkbox checkbox-primary checkbox-sm contact-checkbox"
                        data-number="${c.whatsapp}"
                        ${selectedContacts.has(c.whatsapp) ? 'checked' : ''}>
                    <div class="flex-1 overflow-hidden">
                        <p class="text-sm font-bold truncate group-hover:text-primary transition-colors">${c.name}</p>
                        <p class="text-[10px] font-mono opacity-50">${c.whatsapp}</p>
                    </div>
                </label>
            `).join('');

            list.append(html);

            if (currentContacts.length === 0) {
                list.html('<p class="text-xs opacity-20 text-center py-20 italic">No contacts found</p>');
            }
        }
    } catch (err) {
        console.error('Error fetching contacts:', err);
        list.find('.loading-indicator').remove();
        if (isInitial) list.html('<p class="text-xs text-error p-4 text-center">Error loading contacts</p>');
    } finally {
        pickerState.isLoading = false;
    }
}

function toggleContactSelection(number) {
    if (selectedContacts.has(number)) {
        selectedContacts.delete(number);
    } else {
        selectedContacts.add(number);
    }
    $('#selected-count').text(selectedContacts.size);
}

function toggleAllContacts() {
    const visibleContacts = currentContacts;
    const allSelected = visibleContacts.every(c => selectedContacts.has(c.whatsapp));

    visibleContacts.forEach(c => {
        if (allSelected) selectedContacts.delete(c.whatsapp);
        else selectedContacts.add(c.whatsapp);
    });

    $('#selected-count').text(selectedContacts.size);

    // Update checkboxes efficiently
    const checkboxes = document.querySelectorAll('#contact-list-picker input[type="checkbox"]');
    checkboxes.forEach(cb => {
        const number = cb.getAttribute('data-number');
        cb.checked = selectedContacts.has(number);
    });
}

function applyContactSelection() {
    if (!targetInputSelector) return;

    const numbers = Array.from(selectedContacts).join('\n');
    const input = $(targetInputSelector);
    const current = input.val().trim();

    if (current) {
        input.val(current + '\n' + numbers);
    } else {
        input.val(numbers);
    }

    // Special case for messaging page to switch to bulk
    if (targetInputSelector === '#recipients') {
        if (selectedContacts.size > 1 || (current && selectedContacts.size > 0)) {
            $('input[name="msgType"][value="bulk"]').click();
        }
    }

    document.getElementById('modal_contacts').close();
}
