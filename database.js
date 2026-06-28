const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const APPLICATIONS_FILE = path.join(DATA_DIR, 'applications.json');

// Ensure database directory exists
async function ensureDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    }
}

// Read records from a JSON file
async function readRecords(filePath) {
    await ensureDir();
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return []; // Return empty array if file doesn't exist
        }
        throw err;
    }
}

// Write records to a JSON file
async function writeRecords(filePath, data) {
    await ensureDir();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Generate simple unique ID
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

const db = {
    // CONTACTS
    async getContacts() {
        const contacts = await readRecords(CONTACTS_FILE);
        // Sort newest first
        return contacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async addContact(contactData) {
        const contacts = await readRecords(CONTACTS_FILE);
        const newContact = {
            id: generateId(),
            name: contactData.name,
            email: contactData.email,
            company: contactData.company || '',
            message: contactData.message,
            status: 'New', // New, Contacted, Archived
            createdAt: new Date().toISOString()
        };
        contacts.push(newContact);
        await writeRecords(CONTACTS_FILE, contacts);
        return newContact;
    },

    async updateContactStatus(id, status) {
        const contacts = await readRecords(CONTACTS_FILE);
        const index = contacts.findIndex(c => c.id === id);
        if (index === -1) return null;
        contacts[index].status = status;
        await writeRecords(CONTACTS_FILE, contacts);
        return contacts[index];
    },

    async deleteContact(id) {
        const contacts = await readRecords(CONTACTS_FILE);
        const filtered = contacts.filter(c => c.id !== id);
        await writeRecords(CONTACTS_FILE, filtered);
        return true;
    },

    // APPLICATIONS
    async getApplications() {
        const apps = await readRecords(APPLICATIONS_FILE);
        // Sort newest first
        return apps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async addApplication(appData) {
        const apps = await readRecords(APPLICATIONS_FILE);
        const newApp = {
            id: generateId(),
            name: appData.name,
            email: appData.email,
            phone: appData.phone,
            role: appData.role,
            experience: appData.experience,
            resumeFilename: appData.resumeFilename,
            resumeOriginalName: appData.resumeOriginalName,
            coverLetter: appData.coverLetter,
            status: 'Applied', // Applied, Reviewed, Interviewing, Rejected, Hired
            createdAt: new Date().toISOString()
        };
        apps.push(newApp);
        await writeRecords(APPLICATIONS_FILE, apps);
        return newApp;
    },

    async updateApplicationStatus(id, status) {
        const apps = await readRecords(APPLICATIONS_FILE);
        const index = apps.findIndex(a => a.id === id);
        if (index === -1) return null;
        apps[index].status = status;
        await writeRecords(APPLICATIONS_FILE, apps);
        return apps[index];
    },

    async deleteApplication(id) {
        const apps = await readRecords(APPLICATIONS_FILE);
        const filtered = apps.filter(a => a.id !== id);
        await writeRecords(APPLICATIONS_FILE, filtered);
        return true;
    }
};

module.exports = db;
