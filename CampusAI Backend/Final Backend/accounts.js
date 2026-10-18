const express = require('express');
const router = express.Router();
const path = require('path');
const ImageKit = require("imagekit");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const RAGService = require('./rag');
const mammoth = require('mammoth'); // For DOCX to TXT conversion
const pdfParse = require('pdf-parse'); // For PDF to TXT conversion
const { db, Collections, MongoDBHelper } = require('./mongodb');
const { triggerSmartSolve } = require('./smartsolve'); // Import SmartSolve trigger

// ImageKit Config
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// FIXED API KEY (Must match university_admin.js to ensure consistency)
const FIXED_GEMINI_API_KEY = 'AIzaSyCKRoSZ6GagZPve-uFoGI3uvwiuAKLAvro';

// ------------------------------
// File Conversion Helpers
// ------------------------------
async function convertPDFtoTXT(buffer) {
    try {
        const data = await pdfParse(buffer);
        return data.text || '';
    } catch (error) {
        console.error('PDF conversion error:', error);
        throw new Error('Failed to convert PDF to TXT');
    }
}

async function convertDOCXtoTXT(buffer) {
    try {
        const result = await mammoth.extractRawText({ buffer: buffer });
        return result.value;
    } catch (error) {
        console.error('DOCX conversion error:', error);
        throw new Error('Failed to convert DOCX to TXT');
    }
}

async function convertJSONtoTXT(buffer) {
    try {
        const jsonString = buffer.toString('utf-8');
        const jsonData = JSON.parse(jsonString);
        return convertObjectToStructuredText(jsonData);
    } catch (error) {
        console.error('JSON conversion error:', error);
        throw new Error('Failed to convert JSON to TXT');
    }
}

function convertObjectToStructuredText(obj, depth = 0) {
    const indent = '  '.repeat(depth);
    let result = '';

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            result += `${indent}${key}:\n`;
            result += convertObjectToStructuredText(value, depth + 1);
        } else if (Array.isArray(value)) {
            result += `${indent}${key}:\n`;
            value.forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                    result += `${indent}  [${index + 1}]:\n`;
                    result += convertObjectToStructuredText(item, depth + 2);
                } else {
                    result += `${indent}  [${index + 1}]: ${item}\n`;
                }
            });
        } else {
            result += `${indent}${key}: ${value}\n`;
        }
    }

    return result;
}

async function convertFileToTXT(buffer, originalFileName) {
    const ext = path.extname(originalFileName).toLowerCase();

    switch (ext) {
        case '.pdf':
            return {
                text: await convertPDFtoTXT(buffer),
                converted: true,
                originalExt: '.pdf'
            };
        case '.docx':
        case '.doc':
            return {
                text: await convertDOCXtoTXT(buffer),
                converted: true,
                originalExt: ext
            };
        case '.json':
            return {
                text: await convertJSONtoTXT(buffer),
                converted: true,
                originalExt: '.json'
            };
        case '.txt':
            return {
                text: buffer.toString('utf-8'),
                converted: false,
                originalExt: '.txt'
            };
        default:
            try {
                return {
                    text: buffer.toString('utf-8'),
                    converted: false,
                    originalExt: ext
                };
            } catch {
                throw new Error(`Unsupported file type: ${ext}`);
            }
    }
}

// ------------------------------
// Helper Functions (Firestore-based)
// ------------------------------
const readAccount = async (email) => {
    try {
        const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
        return await MongoDBHelper.getDoc(Collections.ACCOUNTS, sanitizedEmail);
    } catch {
        return null;
    }
};

const writeAccount = async (email, data) => {
    const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
    await MongoDBHelper.setDoc(Collections.ACCOUNTS, sanitizedEmail, data);
};

const readUploads = async (email) => {
    try {
        const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
        const doc = await MongoDBHelper.getDoc(Collections.UPLOADS, sanitizedEmail);
        return doc || { notice: [], faq: [], impData: [] };
    } catch {
        return { notice: [], faq: [], impData: [] };
    }
};

const writeUploads = async (email, data) => {
    const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
    await MongoDBHelper.setDoc(Collections.UPLOADS, sanitizedEmail, data);
};

const readTicket = async (id) => {
    try {
        return await MongoDBHelper.getDoc(Collections.TICKETS, id);
    } catch {
        return null;
    }
};

const writeTicket = async (id, data) => {
    await MongoDBHelper.setDoc(Collections.TICKETS, id, data);
};

const readUniversity = async (email) => {
    try {
        const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
        return await MongoDBHelper.getDoc(Collections.UNIVERSITIES, sanitizedEmail);
    } catch {
        return null;
    }
};

// Helper function to read provider logs
const readProviderLogs = async (providerEmail) => {
    try {
        const safeEmail = MongoDBHelper.sanitizeEmail(providerEmail);
        const doc = await MongoDBHelper.getDoc(Collections.PROVIDER_QUESTIONS, safeEmail);

        if (!doc || !doc.logs) return [];

        const logs = doc.logs;

        // Ensure we have the correct field names from students.js
        return logs.map(log => ({
            studentName: log.user_email || log.studentName || 'Anonymous',
            query: log.question || '',
            ragAnswer: log.response || log.answer || '',
            timestamp: log.asked_at || log.timestamp || new Date().toISOString()
        }));
    } catch (error) {
        // Return empty array if document doesn't exist
        return [];
    }
};

// Helper function to check if date is today
const isToday = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
};

// ------------------------------
// 1️⃣ Account Login (GET)
// ------------------------------
router.get('/login', async (req, res) => {
    try {
        const { accountEmail, password } = req.query;

        if (!accountEmail || !password)
            return res.status(400).json({ error: "accountEmail and password required" });

        const acc = await readAccount(accountEmail);
        if (!acc) return res.status(404).json({ error: "Account not found" });

        const bcrypt = require("bcrypt");
        const match = await bcrypt.compare(password, acc.password);

        if (!match)
            return res.status(401).json({ error: "Invalid password" });

        res.json({ message: "Login successful", account: acc });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------------------
// 2️⃣ Get ALL Tickets For Department (GET)
// ------------------------------
router.get('/tickets/:accountEmail', async (req, res) => {
    try {
        const { accountEmail } = req.params;
        const account = await readAccount(accountEmail);

        if (!account)
            return res.status(404).json({ error: "Account not found" });

        // Get ALL tickets for THIS account
        const allTickets = await MongoDBHelper.queryDocs(Collections.TICKETS, [
            ['accountEmail', '==', accountEmail]
        ]);

        let pending = [], completed = [];

        for (const ticket of allTickets) {
            if (ticket.status === "pending") pending.push(ticket);
            else completed.push(ticket);
        }

        res.json({
            departmentEmail: account.universityEmail,
            totalPending: pending.length,
            totalCompleted: completed.length,
            pending,
            completed
        });

    } catch (err) {
        console.error("Get tickets error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------------------
// 3️⃣ Solve Ticket (GET)
// ------------------------------
router.get('/ticket/solve', async (req, res) => {
    try {
        const { ticketId, solution } = req.query;

        if (!ticketId || !solution)
            return res.status(400).json({ error: "ticketId & solution required" });

        const ticket = await readTicket(ticketId);
        if (!ticket)
            return res.status(404).json({ error: "Ticket not found" });

        ticket.solution = solution;
        ticket.status = "completed";
        ticket.updatedAt = new Date().toISOString();

        await writeTicket(ticketId, ticket);

        res.json({ message: "Ticket marked as completed", ticket });

    } catch (err) {
        console.error("Solve ticket error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------------------
// 4️⃣ Get All Uploads (GET)
// ------------------------------
router.get('/uploads/:accountEmail', async (req, res) => {
    try {
        const uploads = await readUploads(req.params.accountEmail);
        res.json(uploads);
    } catch (err) {
        console.error("Get uploads error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------------------
// 5️⃣ Upload File (GET)
// ------------------------------
router.get('/upload/:accountEmail', async (req, res) => {
    try {
        const { accountEmail } = req.params;
        const { category, fileName, fileData } = req.query;

        if (!category || !fileName || !fileData)
            return res.status(400).json({
                error: "category, fileName, and fileData (base64) required"
            });

        if (!["notice", "faq", "impData"].includes(category))
            return res.status(400).json({ error: "Invalid category" });

        const acc = await readAccount(accountEmail);
        if (!acc) return res.status(404).json({ error: "Account not found" });

        const fileBuffer = Buffer.from(fileData, 'base64');
        let uploadBuffer = fileBuffer;
        let convertedText = null;
        let isConverted = false;

        try {
            const conversionResult = await convertFileToTXT(fileBuffer, fileName);
            if (conversionResult.converted) {
                convertedText = conversionResult.text;
                isConverted = true;
                console.log(`Converted ${fileName} to TXT format internally`);
                uploadBuffer = Buffer.from(convertedText, 'utf-8');
            }
        } catch (conversionError) {
            console.error('File conversion error:', conversionError);
            console.log(`Conversion failed, uploading original file: ${fileName}`);
        }

        const ikUpload = await imagekit.upload({
            file: fileData,
            fileName: fileName
        });

        // Use the FIXED key to ensure it works, regardless of what's in the DB
        const geminiKey = FIXED_GEMINI_API_KEY;

        const ragUpload = await RAGService.uploadFiles(
            geminiKey,
            acc.ragStore.storeName,
            [
                {
                    buffer: uploadBuffer,
                    originalname: fileName
                }
            ]
        );

        const uploads = await readUploads(accountEmail);

        uploads[category].push({
            filename: fileName,
            imagekitUrl: ikUpload.url,
            imagekitFileId: ikUpload.fileId,
            ragData: ragUpload.data || null,
            uploadedAt: new Date().toISOString(),
            _isConvertedToTXT: isConverted,
            _originalExtension: path.extname(fileName).toLowerCase(),
            _convertedTextLength: convertedText ? convertedText.length : 0
        });

        await writeUploads(accountEmail, uploads);

        res.json({
            message: "File uploaded successfully",
            uploads: uploads[category]
        });

    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({
            error: "Internal server error",
            details: err?.message || err
        });
    }
});

// ------------------------------
// 5️⃣ Upload File (POST)
// ------------------------------
router.post('/upload/:accountEmail', async (req, res) => {
    try {
        const { accountEmail } = req.params;
        const { category, fileName, fileData } = req.body;

        if (!category || !fileName || !fileData)
            return res.status(400).json({
                error: "category, fileName, and fileData (base64) required"
            });

        if (!["notice", "faq", "impData"].includes(category))
            return res.status(400).json({ error: "Invalid category" });

        const acc = await readAccount(accountEmail);
        if (!acc) return res.status(404).json({ error: "Account not found" });

        const fileBuffer = Buffer.from(fileData, 'base64');
        let uploadBuffer = fileBuffer;
        let convertedText = null;
        let isConverted = false;

        try {
            const conversionResult = await convertFileToTXT(fileBuffer, fileName);
            if (conversionResult.converted) {
                convertedText = conversionResult.text;
                isConverted = true;
                console.log(`Converted ${fileName} to TXT format internally`);
                uploadBuffer = Buffer.from(convertedText, 'utf-8');
            }
        } catch (conversionError) {
            console.error('File conversion error:', conversionError);
            console.log(`Conversion failed, uploading original file: ${fileName}`);
        }

        const ikUpload = await imagekit.upload({
            file: fileData,
            fileName: fileName
        });

        // Use the FIXED key to ensure it works, regardless of what's in the DB
        const geminiKey = FIXED_GEMINI_API_KEY;

        const ragUpload = await RAGService.uploadFiles(
            geminiKey,
            acc.ragStore.storeName,
            [
                {
                    buffer: uploadBuffer,
                    originalname: fileName
                }
            ]
        );

        const uploads = await readUploads(accountEmail);

        uploads[category].push({
            filename: fileName,
            imagekitUrl: ikUpload.url,
            imagekitFileId: ikUpload.fileId,
            ragData: ragUpload.data || null,
            uploadedAt: new Date().toISOString(),
            _isConvertedToTXT: isConverted,
            _originalExtension: path.extname(fileName).toLowerCase(),
            _convertedTextLength: convertedText ? convertedText.length : 0
        });

        await writeUploads(accountEmail, uploads);

        res.json({
            message: "File uploaded successfully",
            uploads: uploads[category]
        });

    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({
            error: "Internal server error",
            details: err?.message || err
        });
    }
});

// ------------------------------
// 6️⃣ Delete File (GET)
// ------------------------------
router.get('/upload/delete/:accountEmail', async (req, res) => {
    try {
        const { accountEmail } = req.params;
        const { category, filename } = req.query;

        if (!category || !filename)
            return res.status(400).json({ error: "category & filename required" });

        const acc = await readAccount(accountEmail);
        if (!acc) return res.status(404).json({ error: "Account not found" });

        const uploads = await readUploads(accountEmail);

        const fileEntry = uploads[category].find(f => f.filename === filename);
        if (!fileEntry)
            return res.status(404).json({ error: "File not found" });

        await imagekit.deleteFile(fileEntry.imagekitFileId);

        // Use FIXED key for deletion as well
        const geminiKey = FIXED_GEMINI_API_KEY;

        if (university) {
            if (fileEntry.ragData?.documentId) {
                await RAGService.deleteDocument(
                    geminiKey,
                    acc.ragStore.storeName,
                    fileEntry.ragData.documentId
                );
                console.log(`Deleted RAG document: ${fileEntry.ragData.documentId}`);
            }

            try {
                if (RAGService.cleanupByFilename) {
                    await RAGService.cleanupByFilename(
                        geminiKey,
                        acc.ragStore.storeName,
                        filename
                    );
                }
            } catch (cleanupErr) {
                console.log(`RAG cleanup optional: ${cleanupErr.message}`);
            }
        }

        uploads[category] = uploads[category].filter(f => f.filename !== filename);
        await writeUploads(accountEmail, uploads);

        res.json({
            message: "File deleted successfully from all storage (ImageKit & RAG)",
            uploads: uploads[category]
        });

    } catch (err) {
        console.error("Delete file error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------------------
// 7️⃣ Get Account Profile (GET)
// ------------------------------
router.get('/profile/:accountEmail', async (req, res) => {
    try {
        const { accountEmail } = req.params;
        const acc = await readAccount(accountEmail);

        if (!acc) return res.status(404).json({ error: "Account not found" });

        const { password, ...accountData } = acc;

        const university = await readUniversity(acc.universityEmail);
        const universityInfo = university ? {
            universityName: university.universityName,
            universityEmail: university.email,
            universityType: university.universityType,
            city: university.city,
            state: university.state,
            country: university.country
        } : null;

        res.json({
            message: "Account profile retrieved successfully",
            account: accountData,
            universityInfo
        });
    } catch (err) {
        console.error("Get profile error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------------------
// 8️⃣ Update Account Profile (GET)
// ------------------------------
router.get('/profile/update', async (req, res) => {
    try {
        const { accountEmail, ...updates } = req.query;

        if (!accountEmail) {
            return res.status(400).json({ error: 'accountEmail is required' });
        }

        const account = await readAccount(accountEmail);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const protectedFields = [
            'accountId',
            'accountEmail',
            'password',
            'universityEmail',
            'universityId',
            'ragStore',
            'createdAt',
            'isPrimary'
        ];

        protectedFields.forEach(field => {
            if (field in updates) delete updates[field];
        });

        if (updates.isActive !== undefined) {
            updates.isActive = updates.isActive === 'true';
        }

        Object.assign(account, updates, { updatedAt: new Date().toISOString() });
        await writeAccount(accountEmail, account);

        const { password, ...accountData } = account;
        res.json({
            message: 'Account updated successfully',
            account: accountData
        });
    } catch (error) {
        console.error('Update account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ------------------------------
// 9️⃣ Get Tickets by Status (GET)
// ------------------------------
router.get('/tickets/status/:accountEmail', async (req, res) => {
    try {
        const { accountEmail } = req.params;
        const { status } = req.query;

        if (!status || !['pending', 'completed'].includes(status)) {
            return res.status(400).json({ error: 'Valid status (pending/completed) required' });
        }

        const account = await readAccount(accountEmail);
        if (!account) return res.status(404).json({ error: "Account not found" });

        // Query tickets by accountEmail and status
        const tickets = await MongoDBHelper.queryDocs(Collections.TICKETS, [
            ['accountEmail', '==', accountEmail],
            ['status', '==', status]
        ]);

        res.json({
            accountEmail,
            status,
            count: tickets.length,
            tickets
        });
    } catch (err) {
        console.error("Get tickets by status error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------------------
// 🔟 Delete Account (GET)
// ------------------------------
router.get('/delete/:accountEmail', async (req, res) => {
    try {
        const { accountEmail } = req.params;
        const { universityEmail } = req.query;

        if (!universityEmail) {
            return res.status(400).json({ error: 'universityEmail is required' });
        }

        const account = await readAccount(accountEmail);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        if (account.universityEmail !== universityEmail) {
            return res.status(403).json({
                error: 'This account does not belong to the specified university'
            });
        }

        const university = await readUniversity(universityEmail);
        const geminiKey = university?.apiKeyInfo?.key;

        if (account.ragStore?.storeName && geminiKey) {
            try {
                await RAGService.deleteStore(geminiKey, account.ragStore.storeName);
                console.log(`Deleted RAG store: ${account.ragStore.storeName}`);
            } catch (ragErr) {
                console.error(`Error deleting RAG store: ${ragErr.message}`);
            }
        }

        // Delete account document
        const sanitizedEmail = MongoDBHelper.sanitizeEmail(accountEmail);
        await MongoDBHelper.deleteDoc(Collections.ACCOUNTS, sanitizedEmail);

        // Delete uploads document if exists
        try {
            await MongoDBHelper.deleteDoc(Collections.UPLOADS, sanitizedEmail);
        } catch {
            // Uploads document may not exist
        }

        res.json({
            message: 'Account deleted successfully',
            accountEmail: accountEmail
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ------------------------------
// API 11: Get All Feedback for Account (GET)
// ------------------------------
router.get('/feedback/:accountEmail', async (req, res) => {
    try {
        const { accountEmail } = req.params;
        const { limit, minRating, sort } = req.query;

        const account = await readAccount(accountEmail);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const feedbacks = account.feedbacks || [];
        let filteredFeedbacks = feedbacks;

        if (minRating && !isNaN(parseInt(minRating))) {
            const min = parseInt(minRating);
            filteredFeedbacks = feedbacks.filter(f => f.rating >= min);
        }

        let sortedFeedbacks = [...filteredFeedbacks];
        if (sort === 'oldest') {
            sortedFeedbacks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else if (sort === 'rating_high') {
            sortedFeedbacks.sort((a, b) => b.rating - a.rating);
        } else if (sort === 'rating_low') {
            sortedFeedbacks.sort((a, b) => a.rating - b.rating);
        } else {
            sortedFeedbacks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        if (limit && !isNaN(parseInt(limit))) {
            sortedFeedbacks = sortedFeedbacks.slice(0, parseInt(limit));
        }

        const stats = {
            total: feedbacks.length,
            averageRating: feedbacks.length > 0
                ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
                : 0,
            ratingDistribution: {
                1: feedbacks.filter(f => f.rating === 1).length,
                2: feedbacks.filter(f => f.rating === 2).length,
                3: feedbacks.filter(f => f.rating === 3).length,
                4: feedbacks.filter(f => f.rating === 4).length,
                5: feedbacks.filter(f => f.rating === 5).length
            }
        };

        res.json({
            accountEmail,
            accountName: account.accountName,
            stats,
            totalFiltered: sortedFeedbacks.length,
            feedbacks: sortedFeedbacks
        });

    } catch (error) {
        console.error('Get feedback error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ------------------------------
// SSE STREAMING API - ENHANCED VERSION
// ------------------------------
// ------------------------------
// SSE STREAMING API - LATEST 5 FEEDBACKS ON UPDATE
// ------------------------------
router.get('/dashboard/stream/:accountEmail', async (req, res) => {
    let intervalId, heartbeatId;
    let isClientConnected = true;
    let lastAccountCheckTime = Date.now();
    let lastFeedbackChecksum = '';

    try {
        const { accountEmail } = req.params;

        const account = await readAccount(accountEmail);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // DEBUG: Log account feedbacks
        console.log(`🔍 Account feedbacks for ${accountEmail}:`, {
            hasFeedbacks: !!account.feedbacks,
            feedbacksCount: account.feedbacks?.length || 0,
            feedbackSample: account.feedbacks?.slice(0, 2) || []
        });

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        console.log(`📊 SSE dashboard connected for department: ${accountEmail}`);

        // Store the timestamp when API was called (for recent queries)
        const apiCalledTime = new Date();
        let lastQueryTime = apiCalledTime;

        // Store previous checksums
        let previousCountsChecksum = '';
        let previousUploadsChecksum = '';

        // Helper: Format time for display
        const formatTime = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        // Helper: Format date for feedback
        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        // Helper: Check if date is today
        const isToday = (dateString) => {
            if (!dateString) return false;
            const date = new Date(dateString);
            const today = new Date();
            return date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
        };

        // Function to send data
        const sendData = (data) => {
            if (!isClientConnected) return;
            try {
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            } catch (error) {
                console.error('Error sending SSE data:', error);
            }
        };

        // Function to get LAST 5 FEEDBACKS (latest first)
        const getTopFeedbacks = (currentAccount) => {
            const feedbacks = currentAccount?.feedbacks || [];

            const topFeedbacks = feedbacks
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                .slice(0, 5) // Always get latest 5
                .map(feedback => ({
                    studentName: feedback.studentName || 'Anonymous',
                    feedbackText: feedback.feedbackText || feedback.feedback || '',
                    rating: feedback.rating || 0,
                    time: formatDate(feedback.createdAt)
                }))
                .filter(fb => fb.feedbackText.trim().length > 0);

            return topFeedbacks;
        };

        // Function to generate feedback checksum (for detecting changes)
        const generateFeedbackChecksum = (feedbacks) => {
            // Create a simple checksum based on latest feedback IDs and timestamps
            return JSON.stringify(
                feedbacks.slice(0, 5).map(f => ({
                    id: f.feedbackId || f.id,
                    createdAt: f.createdAt
                }))
            );
        };

        // Function to check if account file has been modified
        const hasAccountChanged = async (accountEmail) => {
            try {
                const sanitizedEmail = accountEmail.replace(/[^a-zA-Z0-9@._-]/g, '_');
                const file = path.join(ACCOUNTS_DIR, `${sanitizedEmail}.json`);

                const stats = await fs.stat(file);
                return stats.mtimeMs > lastAccountCheckTime;
            } catch (error) {
                return false;
            }
        };

        // Function to get current account with fresh feedbacks
        const getCurrentAccount = async (accountEmail) => {
            return await readAccount(accountEmail);
        };

        // Function to get counts
        const getCounts = async () => {
            try {
                const providerLogs = await readProviderLogs(accountEmail);
                const totalQueries = providerLogs.length;

                // Query Firestore for tickets
                const tickets = await MongoDBHelper.queryDocs(Collections.TICKETS, [
                    ['accountEmail', '==', accountEmail]
                ]);

                let todayTickets = 0;
                let pendingTickets = 0;
                let resolvedTickets = 0;

                const today = new Date().toISOString().split('T')[0];

                for (const ticket of tickets) {
                    const ticketDate = new Date(ticket.createdAt).toISOString().split('T')[0];
                    if (ticketDate === today) todayTickets++;
                    if (ticket.status === "pending") pendingTickets++;
                    if (ticket.status === "completed") resolvedTickets++;
                }

                return {
                    totalQueries,
                    todayTickets,
                    pendingTickets,
                    resolvedTickets
                };
            } catch (error) {
                console.error('Error getting counts:', error);
                return { totalQueries: 0, todayTickets: 0, pendingTickets: 0, resolvedTickets: 0 };
            }
        };

        // Function to get uploads
        const getUploads = async () => {
            try {
                const uploadsData = await readUploads(accountEmail);
                return {
                    notice: (uploadsData.notice || []).map(u => u.filename).filter(Boolean),
                    faq: (uploadsData.faq || []).map(u => u.filename).filter(Boolean),
                    impData: (uploadsData.impData || []).map(u => u.filename).filter(Boolean)
                };
            } catch (error) {
                console.error('Error getting uploads:', error);
                return { notice: [], faq: [], impData: [] };
            }
        };

        // Function to get NEW queries since last check
        const getNewQueries = async () => {
            try {
                const providerLogs = await readProviderLogs(accountEmail);

                // Get queries that happened AFTER lastQueryTime
                const newQueries = providerLogs
                    .filter(log => {
                        try {
                            const logTime = log.timestamp || log.asked_at;
                            return logTime && new Date(logTime) > lastQueryTime;
                        } catch {
                            return false;
                        }
                    })
                    .map(log => ({
                        studentName: log.studentName || log.user_email || 'Anonymous',
                        question: log.query || log.question || '',
                        answer: log.ragAnswer || log.response || '',
                        time: formatTime(log.timestamp || log.asked_at)
                    }))
                    .reverse(); // Latest first

                // Update lastQueryTime to now if we got new queries
                if (newQueries.length > 0) {
                    lastQueryTime = new Date();
                }

                return newQueries;
            } catch (error) {
                console.error('Error getting new queries:', error);
                return [];
            }
        };

        // Function to get INITIAL recent queries (from API called time)
        const getInitialRecentQueries = async () => {
            try {
                const providerLogs = await readProviderLogs(accountEmail);

                // Get queries that happened AT THE EXACT TIME when API was called
                const recentQueries = providerLogs
                    .filter(log => {
                        try {
                            const logTime = new Date(log.timestamp || log.asked_at);
                            // Get queries from the exact minute when API was called
                            return logTime.getTime() >= apiCalledTime.getTime() - 60000 && // 1 minute before
                                logTime.getTime() <= apiCalledTime.getTime() + 60000;  // 1 minute after
                        } catch {
                            return false;
                        }
                    })
                    .map(log => ({
                        studentName: log.studentName || log.user_email || 'Anonymous',
                        question: log.query || log.question || '',
                        answer: log.ragAnswer || log.response || '',
                        time: formatTime(log.timestamp || log.asked_at)
                    }))
                    .reverse(); // Latest first

                return recentQueries;
            } catch (error) {
                console.error('Error getting initial recent queries:', error);
                return [];
            }
        };

        // Function to generate checksum
        const generateChecksum = (data) => {
            return JSON.stringify(data);
        };

        // Get initial data
        const initialCounts = await getCounts();
        const initialUploads = await getUploads();
        const initialRecentQueries = await getInitialRecentQueries();
        const initialTopFeedbacks = getTopFeedbacks(account);

        // Generate initial feedback checksum
        lastFeedbackChecksum = generateFeedbackChecksum(account.feedbacks || []);

        // Send INITIAL data (everything)
        sendData({
            type: 'initial',
            data: {
                timestamp: apiCalledTime.toISOString(),
                counts: initialCounts,
                recentQueries: initialRecentQueries,
                uploads: initialUploads,
                topFeedbacks: initialTopFeedbacks
            }
        });

        console.log(`📤 Initial data sent to ${accountEmail}`, {
            apiCalledAt: apiCalledTime.toISOString(),
            counts: initialCounts,
            queriesAtCallTime: initialRecentQueries.length,
            feedbacksCount: initialTopFeedbacks.length,
            uploads: initialUploads
        });

        previousCountsChecksum = generateChecksum(initialCounts);
        previousUploadsChecksum = generateChecksum(initialUploads);

        // 🧠 TRIGGER SMARTSOLVE PROCESSING IN BACKGROUND
        // This will check if there are >4 unsolved tickets and cluster them
        triggerSmartSolve(accountEmail);

        // Check for changes every 2 seconds
        intervalId = setInterval(async () => {
            if (!isClientConnected) {
                clearInterval(intervalId);
                return;
            }

            try {
                const changes = {};
                let hasChanges = false;

                // 1. Check for NEW QUERIES (only send new ones)
                const newQueries = await getNewQueries();
                if (newQueries.length > 0) {
                    changes.newQueries = newQueries;
                    hasChanges = true;
                    console.log(`📝 NEW queries for ${accountEmail}: ${newQueries.length}`);
                }

                // 2. Check COUNTS changes
                const currentCounts = await getCounts();
                const currentCountsChecksum = generateChecksum(currentCounts);
                if (currentCountsChecksum !== previousCountsChecksum) {
                    changes.counts = currentCounts;
                    previousCountsChecksum = currentCountsChecksum;
                    hasChanges = true;
                    console.log(`📊 Counts changed for ${accountEmail}:`, currentCounts);
                }

                // 3. Check UPLOADS changes
                const currentUploads = await getUploads();
                const currentUploadsChecksum = generateChecksum(currentUploads);
                if (currentUploadsChecksum !== previousUploadsChecksum) {
                    changes.uploads = currentUploads;
                    previousUploadsChecksum = currentUploadsChecksum;
                    hasChanges = true;
                    console.log(`📎 Uploads changed for ${accountEmail}`);
                }

                // 4. Check FEEDBACKS changes (check if account file modified)
                const accountChanged = await hasAccountChanged(accountEmail);
                if (accountChanged) {
                    console.log(`📝 Account file modified for ${accountEmail}, checking feedbacks...`);
                    lastAccountCheckTime = Date.now();

                    const currentAccount = await getCurrentAccount(accountEmail);
                    const currentFeedbacks = currentAccount?.feedbacks || [];
                    const currentFeedbackChecksum = generateFeedbackChecksum(currentFeedbacks);

                    // If feedbacks have changed (new feedback added)
                    if (currentFeedbackChecksum !== lastFeedbackChecksum) {
                        const latestTopFeedbacks = getTopFeedbacks(currentAccount);
                        changes.topFeedbacks = latestTopFeedbacks;
                        lastFeedbackChecksum = currentFeedbackChecksum;
                        hasChanges = true;

                        console.log(`⭐ FEEDBACKS UPDATED for ${accountEmail}:`, {
                            newCount: currentFeedbacks.length,
                            topFeedbacksCount: latestTopFeedbacks.length,
                            latestFeedback: latestTopFeedbacks[0] ? {
                                student: latestTopFeedbacks[0].studentName,
                                rating: latestTopFeedbacks[0].rating,
                                preview: latestTopFeedbacks[0].feedbackText.substring(0, 50) + '...'
                            } : null
                        });
                    }
                }

                // Send only if there are changes
                if (hasChanges) {
                    sendData({
                        type: 'update',
                        data: changes
                    });
                }

            } catch (error) {
                console.error('Error in SSE interval:', error);
            }
        }, 2000);

        // Send heartbeat every 25 seconds
        heartbeatId = setInterval(() => {
            if (!isClientConnected) {
                clearInterval(heartbeatId);
                return;
            }
            try {
                res.write(': heartbeat\n\n');
            } catch (error) {
                // Connection closed
            }
        }, 25000);

        // Handle client disconnect
        req.on('close', () => {
            console.log(`📴 SSE dashboard disconnected for department: ${accountEmail}`);
            isClientConnected = false;
            if (intervalId) clearInterval(intervalId);
            if (heartbeatId) clearInterval(heartbeatId);
            res.end();
        });

        // Handle errors
        req.on('error', (error) => {
            console.error(`SSE connection error for ${accountEmail}:`, error);
            isClientConnected = false;
            if (intervalId) clearInterval(intervalId);
            if (heartbeatId) clearInterval(heartbeatId);
        });

    } catch (error) {
        console.error('SSE dashboard setup error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

module.exports = router;