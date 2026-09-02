const express = require('express');
const db = require('./db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || 'your_super_secret_key';

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

router.post('/upload', authenticateToken, upload.single('document'), (req, res) => {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filename = file.originalname;
    const filepath = file.path;

    db.run('INSERT INTO documents (user_id, filename, filepath, status) VALUES (?, ?, ?, ?)', 
        [userId, filename, filepath, 'Pending'], 
        function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Error saving document to database' });
            }
            res.status(201).json({ message: 'Document uploaded successfully', documentId: this.lastID, status: 'Pending' });
        }
    );
});

router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.all('SELECT id, user_id, filename, status, upload_date, extracted_text FROM documents WHERE user_id = ? ORDER BY upload_date DESC', [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching documents' });
        }
        const data = rows.map(row => ({
            ...row,
            confidence: row.status !== 'Pending' ? 'Verified via OCR' : '-'
        }));
        res.json(data);
    });
});

// REAL AI Verification with Tesseract OCR
router.post('/:id/verify', authenticateToken, (req, res) => {
    const docId = req.params.id;
    const userId = req.user.id;

    // Get filepath
    db.get('SELECT filepath FROM documents WHERE id = ? AND user_id = ?', [docId, userId], async (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Document not found' });
        }

        try {
            // Run Tesseract OCR
            console.log(`Running OCR on: ${row.filepath}`);
            const { data: { text } } = await Tesseract.recognize(
                row.filepath,
                'eng',
                { logger: m => console.log(m) }
            );

            console.log("Extracted Text:", text);

            const keywords = ['license', 'passport', 'government', 'id', 'state', 'republic', 'driving', 'aadhaar', 'pan', 'card', 'identification'];
            const lowerText = text.toLowerCase();
            
            // Check if any keyword is in the extracted text
            const isVerified = keywords.some(kw => lowerText.includes(kw));
            const newStatus = isVerified ? 'Verified' : 'Rejected';

            db.run('UPDATE documents SET status = ?, extracted_text = ? WHERE id = ?', 
                [newStatus, text, docId], 
                function(updateErr) {
                    if (updateErr) {
                        return res.status(500).json({ error: 'Error updating status' });
                    }
                    res.json({ message: 'Verification complete', status: newStatus, extractedText: text });
                }
            );

        } catch (ocrError) {
            console.error("OCR Error:", ocrError);
            db.run('UPDATE documents SET status = ?, extracted_text = ? WHERE id = ?', 
                ['Rejected', 'Error during OCR reading (make sure it is a clear image)', docId], 
                () => {
                    res.status(500).json({ error: 'OCR Processing failed', status: 'Rejected' });
                }
            );
        }
    });
});

module.exports = router;
