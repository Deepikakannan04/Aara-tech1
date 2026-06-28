// Admin Dashboard JS Logic

const API_BASE = window.location.port === '3000' ? '' : 'http://localhost:3000';

let contactsData = [];
let applicationsData = [];
let activeTab = 'contacts'; // 'contacts' or 'applications'
let deleteTarget = null; // { id, type }

// Status options for filters and dropdowns
const contactStatuses = ['New', 'Contacted', 'Archived'];
const applicationStatuses = ['Applied', 'Reviewed', 'Interviewing', 'Rejected', 'Hired'];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

// Fetch all data from API endpoints
async function fetchData() {
    showLoadingSpinner(true);
    try {
        const [contactsRes, appsRes] = await Promise.all([
            fetch(`${API_BASE}/api/admin/contacts`),
            fetch(`${API_BASE}/api/admin/applications`)
        ]);

        if (!contactsRes.ok || !appsRes.ok) {
            throw new Error('API request failed');
        }

        contactsData = await contactsRes.json();
        applicationsData = await appsRes.json();

        updateStats();
        populateStatusFilter();
        renderActiveGrid();
    } catch (err) {
        console.error('Failed to load dashboard data:', err);
        showErrorMessage('Could not load data. Ensure backend server is running.');
    } finally {
        showLoadingSpinner(false);
    }
}

// Show/hide loading spinners in lists
function showLoadingSpinner(show) {
    const grids = ['contacts-grid', 'applications-grid'];
    grids.forEach(id => {
        const grid = document.getElementById(id);
        if (grid) {
            grid.innerHTML = show ? `<div class="loading-spinner">Fetching records...</div>` : '';
        }
    });
}

// Show error messages in both tabs if fetch fails
function showErrorMessage(message) {
    const grids = ['contacts-grid', 'applications-grid'];
    grids.forEach(id => {
        const grid = document.getElementById(id);
        if (grid) {
            grid.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Error Occurred</h3><p>${message}</p></div>`;
        }
    });
}

// Update dashboard statistics header
function updateStats() {
    const totalContacts = contactsData.length;
    const totalApplications = applicationsData.length;

    // Count unprocessed items
    const newContactsCount = contactsData.filter(c => c.status === 'New').length;
    const newAppsCount = applicationsData.filter(a => a.status === 'Applied').length;
    const totalNew = newContactsCount + newAppsCount;

    // Update statistics numbers
    document.getElementById('stat-total-contacts').innerText = totalContacts;
    document.getElementById('stat-total-applications').innerText = totalApplications;
    document.getElementById('stat-new-actions').innerText = totalNew;

    // Update tab counters
    document.getElementById('count-contacts').innerText = totalContacts;
    document.getElementById('count-applications').innerText = totalApplications;
}

// Dynamically populate status filters based on the current active tab
function populateStatusFilter() {
    const filterStatusSelect = document.getElementById('filter-status');
    const currentValue = filterStatusSelect.value;
    
    filterStatusSelect.innerHTML = '<option value="">All Statuses</option>';
    
    const statuses = activeTab === 'contacts' ? contactStatuses : applicationStatuses;
    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.innerText = status;
        filterStatusSelect.appendChild(option);
    });

    // Reapply status value if it is valid for the new tab
    if (statuses.includes(currentValue)) {
        filterStatusSelect.value = currentValue;
    } else {
        filterStatusSelect.value = '';
    }
}

// Switch between Contacts and Career Applications tabs
function switchTab(tab) {
    if (tab === activeTab) return;
    
    activeTab = tab;

    // Toggle tab buttons visual active state
    document.getElementById('tab-contacts-btn').classList.toggle('active', tab === 'contacts');
    document.getElementById('tab-applications-btn').classList.toggle('active', tab === 'applications');

    // Toggle view panels visibility
    document.getElementById('contacts-view').classList.toggle('active', tab === 'contacts');
    document.getElementById('applications-view').classList.toggle('active', tab === 'applications');

    // Show/hide role filter
    document.getElementById('filter-role').style.display = tab === 'applications' ? 'inline-block' : 'none';

    // Clear search and status selection to make switching smooth
    document.getElementById('search-input').value = '';
    
    populateStatusFilter();
    renderActiveGrid();
}

// Filter and render active tab content
function applyFilters() {
    renderActiveGrid();
}

function renderActiveGrid() {
    const searchVal = document.getElementById('search-input').value.toLowerCase().trim();
    const statusVal = document.getElementById('filter-status').value;
    
    if (activeTab === 'contacts') {
        let filtered = contactsData;

        // Apply status filter
        if (statusVal) {
            filtered = filtered.filter(c => c.status === statusVal);
        }

        // Apply search keyword filter
        if (searchVal) {
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(searchVal) ||
                c.email.toLowerCase().includes(searchVal) ||
                c.company.toLowerCase().includes(searchVal) ||
                c.message.toLowerCase().includes(searchVal)
            );
        }

        renderContacts(filtered);
    } else {
        let filtered = applicationsData;
        const roleVal = document.getElementById('filter-role').value;

        // Apply status filter
        if (statusVal) {
            filtered = filtered.filter(a => a.status === statusVal);
        }

        // Apply role filter
        if (roleVal) {
            filtered = filtered.filter(a => a.role === roleVal);
        }

        // Apply search keyword filter
        if (searchVal) {
            filtered = filtered.filter(a => 
                a.name.toLowerCase().includes(searchVal) ||
                a.email.toLowerCase().includes(searchVal) ||
                a.phone.includes(searchVal) ||
                a.experience.toLowerCase().includes(searchVal) ||
                a.coverLetter.toLowerCase().includes(searchVal)
            );
        }

        renderApplications(filtered);
    }
}

// Render contacts list
function renderContacts(contacts) {
    const grid = document.getElementById('contacts-grid');
    if (!contacts.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="icon">✉️</div>
                <h3>No Inquiries Found</h3>
                <p>There are no inquiries matching your filter criteria.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = contacts.map(c => {
        const dateFormatted = new Date(c.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Determine status class for badging
        const statusClass = c.status.toLowerCase();

        return `
            <div class="submission-card" id="contact-card-${c.id}">
                <div class="card-header">
                    <div class="sender-info">
                        <h3>${escapeHtml(c.name)}</h3>
                        <div class="sender-meta">
                            <span>📧 <a href="mailto:${c.email}">${escapeHtml(c.email)}</a></span>
                            <span>📅 ${dateFormatted}</span>
                        </div>
                    </div>
                    <div class="card-header-actions">
                        <span class="status-badge ${statusClass}">${c.status}</span>
                    </div>
                </div>

                <div class="card-body">
                    ${c.company ? `<div class="company-tag">🏢 ${escapeHtml(c.company)}</div>` : ''}
                    <div class="message-box">${escapeHtml(c.message)}</div>
                </div>

                <div class="card-footer">
                    <div class="status-change-wrapper">
                        <label for="status-select-${c.id}">Change Status:</label>
                        <select id="status-select-${c.id}" class="status-select" onchange="updateContactStatus('${c.id}', this.value)">
                            ${contactStatuses.map(status => `
                                <option value="${status}" ${c.status === status ? 'selected' : ''}>${status}</option>
                            `).join('')}
                        </select>
                    </div>
                    <button class="btn btn-danger btn-small" onclick="confirmDelete('${c.id}', 'contact')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Render job applications list
function renderApplications(apps) {
    const grid = document.getElementById('applications-grid');
    if (!apps.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="icon">📄</div>
                <h3>No Applications Found</h3>
                <p>There are no applications matching your filter criteria.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = apps.map(a => {
        const dateFormatted = new Date(a.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const statusClass = a.status.toLowerCase();
        
        // Human-readable role names
        const roleNames = {
            'software-engineer': 'Software Engineer',
            'flutter-developer': 'Senior Flutter Developer',
            'full-stack-developer': 'Senior Full Stack Developer'
        };
        const roleLabel = roleNames[a.role] || a.role;

        return `
            <div class="submission-card" id="app-card-${a.id}">
                <div class="card-header">
                    <div class="sender-info">
                        <h3>${escapeHtml(a.name)}</h3>
                        <div class="sender-meta">
                            <span>📧 <a href="mailto:${a.email}">${escapeHtml(a.email)}</a></span>
                            <span>📞 <a href="tel:${a.phone}">${escapeHtml(a.phone)}</a></span>
                            <span>📅 ${dateFormatted}</span>
                        </div>
                    </div>
                    <div class="card-header-actions">
                        <span class="status-badge ${statusClass}">${a.status}</span>
                    </div>
                </div>

                <div class="card-body">
                    <div class="career-details">
                        <div class="detail-item">
                            <strong>Applied For:</strong>
                            <span>${escapeHtml(roleLabel)}</span>
                        </div>
                        <div class="detail-item">
                            <strong>Experience:</strong>
                            <span>${escapeHtml(a.experience)}</span>
                        </div>
                    </div>

                    <a href="${API_BASE}/uploads/${encodeURIComponent(a.resumeFilename)}" download="${encodeURIComponent(a.resumeOriginalName)}" class="resume-download-btn">
                        📎 Download Resume (${escapeHtml(a.resumeOriginalName)})
                    </a>

                    <div class="cover-letter-box">
                        <strong>Cover Letter:</strong>
                        <p style="margin-top: 6px;">${escapeHtml(a.coverLetter)}</p>
                    </div>
                </div>

                <div class="card-footer">
                    <div class="status-change-wrapper">
                        <label for="status-select-${a.id}">Change Status:</label>
                        <select id="status-select-${a.id}" class="status-select" onchange="updateApplicationStatus('${a.id}', this.value)">
                            ${applicationStatuses.map(status => `
                                <option value="${status}" ${a.status === status ? 'selected' : ''}>${status}</option>
                            `).join('')}
                        </select>
                    </div>
                    <button class="btn btn-danger btn-small" onclick="confirmDelete('${a.id}', 'application')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// API Call: Update Contact Status
async function updateContactStatus(id, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/contacts/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (!res.ok) throw new Error('Failed to update contact status');

        // Update local dataset and headers
        const index = contactsData.findIndex(c => c.id === id);
        if (index !== -1) {
            contactsData[index].status = newStatus;
            updateStats();
            // Refresh visual badge inside the card
            const card = document.getElementById(`contact-card-${id}`);
            if (card) {
                const badge = card.querySelector('.status-badge');
                badge.className = `status-badge ${newStatus.toLowerCase()}`;
                badge.innerText = newStatus;
            }
        }
    } catch (err) {
        alert('Failed to update status. Please try again.');
        console.error(err);
    }
}

// API Call: Update Application Status
async function updateApplicationStatus(id, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/applications/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (!res.ok) throw new Error('Failed to update application status');

        // Update local dataset and headers
        const index = applicationsData.findIndex(a => a.id === id);
        if (index !== -1) {
            applicationsData[index].status = newStatus;
            updateStats();
            // Refresh visual badge inside card
            const card = document.getElementById(`app-card-${id}`);
            if (card) {
                const badge = card.querySelector('.status-badge');
                badge.className = `status-badge ${newStatus.toLowerCase()}`;
                badge.innerText = newStatus;
            }
        }
    } catch (err) {
        alert('Failed to update status. Please try again.');
        console.error(err);
    }
}

// Delete Submission Actions
function confirmDelete(id, type) {
    deleteTarget = { id, type };
    const modal = document.getElementById('delete-modal');
    modal.style.display = 'flex';
    
    // Wire confirm trigger
    document.getElementById('confirm-delete-btn').onclick = executeDelete;
}

function closeDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
    deleteTarget = null;
}

async function executeDelete() {
    if (!deleteTarget) return;

    const { id, type } = deleteTarget;
    const url = type === 'contact' ? `${API_BASE}/api/admin/contacts/${id}` : `${API_BASE}/api/admin/applications/${id}`;

    try {
        const res = await fetch(url, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete request failed');

        if (type === 'contact') {
            contactsData = contactsData.filter(c => c.id !== id);
        } else {
            applicationsData = applicationsData.filter(a => a.id !== id);
        }

        closeDeleteModal();
        updateStats();
        renderActiveGrid();
    } catch (err) {
        alert('Could not delete submission.');
        console.error(err);
    }
}

// Simple HTML escaping helper for security
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
