const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and parsing of JSON and URL-encoded bodies
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Directories (data/ and uploads/)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration for resumes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Safe filename with timestamp prefix
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, Date.now() + '-' + cleanName);
    }
});

// Resume file filter (PDF, DOC, DOCX)
const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only .pdf, .doc, and .docx resumes are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Middleware to block direct access to sensitive system files
app.use((req, res, next) => {
    const forbiddenFiles = ['server.js', 'database.js', 'package.json', 'package-lock.json', '.git'];
    const isForbidden = forbiddenFiles.some(file => req.path.includes(file)) || req.path.startsWith('/data/');
    if (isForbidden) {
        return res.status(403).send('Forbidden: Access to configuration or database files is denied.');
    }
    next();
});

// Expose uploaded resumes securely
app.use('/uploads', express.static(uploadsDir));

// Expose root directory for serving client HTML, CSS, JS and images
app.use(express.static(__dirname));

/* --- API ROUTES --- */

// 1. Submit Contact Form
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, company, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Name, email, and message are required fields.' });
        }

        const newContact = await db.addContact({ name, email, company, message });
        res.status(201).json({ success: true, message: 'Contact message saved successfully.', data: newContact });
    } catch (err) {
        console.error('Error handling contact form:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. Submit Career Application (with Resume)
app.post('/api/apply', (req, res) => {
    // Handle single file upload for field name 'resume'
    upload.single('resume')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        try {
            const name = req.body['applicant-name'];
            const email = req.body['applicant-email'];
            const phone = req.body['applicant-phone'];
            const role = req.body['desired-role'];
            const experience = req.body['experience'];
            const coverLetter = req.body['cover-letter'];

            if (!name || !email || !phone || !role || !experience || !coverLetter) {
                return res.status(400).json({ error: 'All fields are required.' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'Please upload your resume file.' });
            }

            const appData = {
                name,
                email,
                phone,
                role,
                experience,
                resumeFilename: req.file.filename,
                resumeOriginalName: req.file.originalname,
                coverLetter
            };

            const newApp = await db.addApplication(appData);
            res.status(201).json({ success: true, message: 'Application submitted successfully.', data: newApp });
        } catch (err) {
            console.error('Error handling career application:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
});

/* --- ADMIN API ROUTES --- */

// Get all contacts
app.get('/api/admin/contacts', async (req, res) => {
    try {
        const contacts = await db.getContacts();
        res.json(contacts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve contacts.' });
    }
});

// Update contact status
app.patch('/api/admin/contacts/:id', async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'Status is required.' });

        const updated = await db.updateContactStatus(req.params.id, status);
        if (!updated) return res.status(404).json({ error: 'Contact not found.' });

        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update contact status.' });
    }
});

// Delete contact
app.delete('/api/admin/contacts/:id', async (req, res) => {
    try {
        await db.deleteContact(req.params.id);
        res.json({ success: true, message: 'Contact deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete contact.' });
    }
});

// Get all applications
app.get('/api/admin/applications', async (req, res) => {
    try {
        const applications = await db.getApplications();
        res.json(applications);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve applications.' });
    }
});

// Update application status
app.patch('/api/admin/applications/:id', async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'Status is required.' });

        const updated = await db.updateApplicationStatus(req.params.id, status);
        if (!updated) return res.status(404).json({ error: 'Application not found.' });

        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update application status.' });
    }
});

// Delete application
app.delete('/api/admin/applications/:id', async (req, res) => {
    try {
        await db.deleteApplication(req.params.id);
        res.json({ success: true, message: 'Application deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete application.' });
    }
});

// Fallback to index.html for undefined GET routes (do not catch /api/*)
app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  AaraTech Backend Server Running!`);
    console.log(`  Local URL:   http://localhost:${PORT}`);
    console.log(`  Admin Panel: http://localhost:${PORT}/admin.html`);
    console.log(`==================================================`);
});
