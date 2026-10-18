const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const path = require('path');
const ragService = require('./rag');
const { scrapeWebsite } = require("./webscrapper");
const { db, Collections, MongoDBHelper } = require('./mongodb');

// Database paths (legacy - kept for reference)
const DB_DIR = path.join(__dirname, 'database');
const UNIVERSITIES_DIR = path.join(DB_DIR, 'universities');
const ACCOUNTS_DIR = path.join(DB_DIR, 'accounts');
const STUDENTS_DIR = path.join(DB_DIR, 'students');
const PENDING_REGISTRATIONS_FILE = path.join(DB_DIR, 'pending_registrations.json');

// FIXED API KEY FOR ALL UNIVERSITIES
const FIXED_GEMINI_API_KEY = 'AIzaSyCKRoSZ6GagZPve-uFoGI3uvwiuAKLAvro';

// No need to initialize directories with Firestore
// Firestore collections are created automatically

// Helper: Read pending registrations
const readPendingRegistrations = async () => {
    try {
        const doc = await MongoDBHelper.getDoc(Collections.PENDING_REGISTRATIONS, 'registry');
        return doc?.registrations || [];
    } catch (error) {
        return [];
    }
};

// Helper: Write pending registrations
const writePendingRegistrations = async (registrations) => {
    await MongoDBHelper.setDoc(Collections.PENDING_REGISTRATIONS, 'registry', {
        registrations,
        updatedAt: new Date().toISOString()
    });
};

// Helper: Read university data
const readUniversity = async (email) => {
    try {
        const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
        return await MongoDBHelper.getDoc(Collections.UNIVERSITIES, sanitizedEmail);
    } catch (error) {
        return null;
    }
};

// Helper: Write university data
const writeUniversity = async (email, universityData) => {
    const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
    await MongoDBHelper.setDoc(Collections.UNIVERSITIES, sanitizedEmail, universityData);
};

// Helper: Check if university exists
const universityExists = async (email) => {
    const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
    return await MongoDBHelper.docExists(Collections.UNIVERSITIES, sanitizedEmail);
};

// Helper: Read account data
const readAccount = async (email) => {
    try {
        const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
        return await MongoDBHelper.getDoc(Collections.ACCOUNTS, sanitizedEmail);
    } catch (error) {
        return null;
    }
};

// Helper: Write account data
const writeAccount = async (email, accountData) => {
    const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
    await MongoDBHelper.setDoc(Collections.ACCOUNTS, sanitizedEmail, accountData);
};

// Helper: Check if account exists
const accountExists = async (email) => {
    const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
    return await MongoDBHelper.docExists(Collections.ACCOUNTS, sanitizedEmail);
};

// Helper: Get all accounts for a university
const getUniversityAccounts = async (universityEmail) => {
    try {
        const accounts = await MongoDBHelper.queryDocs(Collections.ACCOUNTS, [
            ['universityEmail', '==', universityEmail]
        ]);

        // Remove passwords from response
        return accounts.map(account => {
            const { password, ...accountData } = account;
            return accountData;
        });
    } catch (error) {
        console.error('Error getting university accounts:', error);
        return [];
    }
};

async function scrapeAndUploadWebsite(university, ragService) {
    try {
        console.log(`\n🌐 Scraping website for: ${university.websiteUrl}`);

        const pages = await scrapeWebsite(university.websiteUrl);

        const jsonPayload = {
            url: university.websiteUrl,
            pages
        };

        const storeName = university.ragStore.storeName;

        const uploadResult = await ragService.uploadFiles(
            FIXED_GEMINI_API_KEY,
            storeName,
            [
                {
                    buffer: Buffer.from(JSON.stringify(jsonPayload)),
                    originalname: "website_content.json"
                }
            ]
        );

        if (!uploadResult.success) {
            console.error("❌ Website upload failed:", uploadResult.error);
            return false;
        }

        console.log("✅ Website content uploaded to store:", storeName);
        return true;

    } catch (err) {
        console.error("❌ Website scraping/upload error:", err);
        return false;
    }
}

// ============================================
// UNIVERSITY REGISTRATION & LOGIN APIs (GET VERSION)
// ============================================

// API 1: Initial Registration - Email and Password (GET)
router.get('/register/initiate', async (req, res) => {
    try {
        const { email, password } = req.query;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Password strength validation
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        // Check if email already exists
        const exists = await universityExists(email);
        if (exists) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Check if pending registration exists (by email only)
        const pendingRegistrations = await readPendingRegistrations();
        const existingPending = pendingRegistrations.find(reg => reg.email === email);
        if (existingPending) {
            return res.status(409).json({
                error: 'Registration already in progress for this email',
                email
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create pending registration
        const newRegistration = {
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };

        pendingRegistrations.push(newRegistration);
        await writePendingRegistrations(pendingRegistrations);

        res.status(201).json({
            message: 'Initial registration successful. Please complete your university details.',
            email
        });
    } catch (error) {
        console.error('Registration initiation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API 2: Complete Registration - University Details (GET)
router.get('/register/complete', async (req, res) => {
    try {
        const {
            email,
            universityName,
            universityType,
            city,
            state,
            country,
            websiteUrl,
            establishedDate,
            studentEmailExtension,
            description,
            phoneNumber,
            accreditation
        } = req.query;

        // Validation
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if pending registration exists (by email only)
        const pendingRegistrations = await readPendingRegistrations();
        const pendingIndex = pendingRegistrations.findIndex(
            reg => reg.email === email
        );

        if (pendingIndex === -1) {
            return res.status(404).json({ error: 'Invalid or expired registration' });
        }

        const pendingReg = pendingRegistrations[pendingIndex];

        // Check if registration has expired
        if (new Date() > new Date(pendingReg.expiresAt)) {
            pendingRegistrations.splice(pendingIndex, 1);
            await writePendingRegistrations(pendingRegistrations);
            return res.status(410).json({ error: 'Registration session expired. Please start again.' });
        }

        // Validate required fields
        const requiredFields = {
            universityName,
            universityType,
            city,
            state,
            country,
            websiteUrl,
            establishedDate,
            studentEmailExtension
        };

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                return res.status(400).json({ error: `${key} is required` });
            }
        }

        // Validate university type
        const validTypes = ['Public', 'Private', 'Government', 'Deemed', 'Autonomous'];
        if (!validTypes.includes(universityType)) {
            return res.status(400).json({
                error: `Invalid university type. Must be one of: ${validTypes.join(', ')}`
            });
        }

        // Validate website URL
        const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        if (!urlRegex.test(websiteUrl)) {
            return res.status(400).json({ error: 'Invalid website URL format' });
        }

        // Validate email extension format
        if (!studentEmailExtension.startsWith('@')) {
            return res.status(400).json({
                error: 'Student email extension must start with @ (e.g., @kletech.ac.in)'
            });
        }

        // Validate established date
        const estDate = new Date(establishedDate);
        if (isNaN(estDate.getTime()) || estDate > new Date()) {
            return res.status(400).json({ error: 'Invalid established date' });
        }

        // Create university ID
        const universityId = `univ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create RAG store for the university using FIXED API KEY
        console.log(`Creating RAG store for university: ${universityName}`);
        const ragStoreResult = await ragService.initializeUniversityStore(
            FIXED_GEMINI_API_KEY,
            universityName,
            email
        );

        if (!ragStoreResult.success) {
            return res.status(500).json({
                error: `Failed to create document store: ${ragStoreResult.error}`
            });
        }

        const ragStoreName = ragStoreResult.data.store_name;
        const ragStoreResource = ragStoreResult.data.file_search_store_resource;

        console.log(`RAG store created successfully: ${ragStoreName}`);

        // Create university record with FIXED API KEY
        const university = {
            universityId,
            email: pendingReg.email,
            password: pendingReg.password,
            universityName,
            universityType,
            city,
            state,
            country,
            websiteUrl,
            establishedDate: estDate.toISOString(),
            studentEmailExtension,
            description: description || '',
            phoneNumber: phoneNumber || '',
            accreditation: accreditation || '',
            read_website: true,
            isActive: true,
            // STORE FIXED API KEY IN UNIVERSITY RECORD
            apiKeyInfo: {
                key: FIXED_GEMINI_API_KEY,
                assignedAt: new Date().toISOString(),
                isFixedKey: true
            },
            ragStore: {
                storeName: ragStoreName,
                storeResource: ragStoreResource,
                createdAt: new Date().toISOString()
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Background website scraping using FIXED API KEY
        void (async () => {
            try {
                await scrapeAndUploadWebsite(
                    {
                        websiteUrl,
                        ragStore: { storeName: ragStoreName }
                    },
                    ragService
                );
                console.log("✅ (BACKGROUND) Website scraped & uploaded.");
            } catch (err) {
                console.error("❌ (BACKGROUND) Scraping error:", err);
            }
        })();

        // Save to database
        await writeUniversity(email, university);

        // Remove from pending registrations
        pendingRegistrations.splice(pendingIndex, 1);
        await writePendingRegistrations(pendingRegistrations);

        // Return response without password
        const { password, ...universityResponse } = university;

        res.status(201).json({
            message: 'University registered successfully with dedicated document store',
            universityId,
            university: universityResponse
        });
    } catch (error) {
        console.error('Registration completion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API 3: Login (GET version)
router.get('/login', async (req, res) => {
    try {
        const { email, password, loginType } = req.query;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (!loginType || !['admin', 'account'].includes(loginType)) {
            return res.status(400).json({ error: 'loginType must be either "admin" or "account"' });
        }

        if (loginType === 'admin') {
            // Admin login - login to university admin account
            const university = await readUniversity(email);
            if (!university) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, university.password);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Check if account is active
            if (!university.isActive) {
                return res.status(403).json({ error: 'Account is deactivated' });
            }

            // Return response without password
            const { password: _, ...universityData } = university;

            res.json({
                message: 'Admin login successful',
                loginType: 'admin',
                data: universityData
            });

        } else if (loginType === 'account') {
            // Account login - login to subaccount created by admin
            const account = await readAccount(email);
            if (!account) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, account.password);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Check if account is active
            if (!account.isActive) {
                return res.status(403).json({ error: 'Account is deactivated' });
            }

            // Get university details (without sensitive info)
            const university = await readUniversity(account.universityEmail);
            const universityInfo = university ? {
                universityName: university.universityName,
                universityEmail: university.email,
                universityType: university.universityType,
                city: university.city,
                state: university.state,
                country: university.country
            } : null;

            // Return response without password
            const { password: __, ...accountData } = account;

            res.json({
                message: 'Account login successful',
                loginType: 'account',
                data: {
                    ...accountData,
                    universityInfo
                }
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API 4: Toggle read_website attribute (GET)
router.get("/toggle-website-access", async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ error: "email is required" });
        }

        const university = await readUniversity(email);
        if (!university) {
            return res.status(404).json({ error: "University not found" });
        }

        const storeName = university.ragStore.storeName;
        const storeResource = university.ragStore.storeResource;
        const websiteUrl = university.websiteUrl;

        // Toggle read_website flag
        university.read_website = !university.read_website;
        university.updatedAt = new Date().toISOString();
        await writeUniversity(email, university);

        // Update all accounts' accessibleStores when university toggles website access
        const accounts = await getUniversityAccounts(email);
        for (const acc of accounts) {
            const account = await readAccount(acc.accountEmail);
            if (account) {
                if (!university.read_website) {
                    // Remove university store from account's accessible stores
                    account.accessibleStores = (account.accessibleStores || []).filter(
                        store => store.accessType !== 'university_website'
                    );
                } else {
                    // Add university store to account's accessible stores if not already present
                    const hasAccess = (account.accessibleStores || []).some(
                        store => store.storeName === storeName
                    );
                    if (!hasAccess && storeResource) {
                        account.accessibleStores = account.accessibleStores || [];
                        account.accessibleStores.push({
                            storeName: storeName,
                            storeResource: storeResource,
                            isPrimary: false,
                            accessType: 'university_website'
                        });
                    }
                }
                account.updatedAt = new Date().toISOString();
                await writeAccount(acc.accountEmail, account);
                console.log(`Updated accessible stores for account: ${acc.accountEmail}`);
            }
        }

        if (!university.read_website) {
            // READ WEBSITE TURNED OFF - Remove website_content.json
            console.log("\n❌ READ WEBSITE: OFF — Removing website_content.json");

            // Delete website_content.json FROM ADMIN STORE using FIXED API KEY
            try {
                const stats = await ragService.listStores(FIXED_GEMINI_API_KEY);
                const store = stats?.data?.stores?.find(s => s.store_name === storeName);

                if (store?.documents?.length) {
                    for (const doc of store.documents) {
                        if (doc.file_name === "website_content.json") {
                            console.log("🗑 Removing website_content.json...");
                            await ragService.deleteDocument(
                                FIXED_GEMINI_API_KEY,
                                storeName,
                                doc.document_id
                            );
                        }
                    }
                } else {
                    console.log("ℹ No website_content.json found in admin store.");
                }
            } catch (err) {
                console.error("❌ Error deleting website_content.json:", err);
            }

            // REMOVE FROM STUDENTS (IF THEY EXIST)
            try {
                // Query all students for this university
                const students = await MongoDBHelper.queryDocs(Collections.STUDENTS, [
                    ['universityEmail', '==', email]
                ]);

                if (students.length === 0) {
                    console.log("ℹ No students found — skipping student cleanup.");
                } else {
                    for (const student of students) {
                        student.accessibleStores = (student.accessibleStores || [])
                            .filter(s => s.storeName !== storeName);

                        await MongoDBHelper.setDoc(Collections.STUDENTS,
                            MongoDBHelper.sanitizeEmail(student.email),
                            student
                        );
                        console.log(`✔ Removed store from student: ${student.email}`);
                    }
                }
            } catch (err) {
                console.error("❌ Student cleanup error:", err);
            }

            return res.json({
                message: "Website disabled. Store removed from admin and students (if any)."
            });
        }

        // READ WEBSITE TURNED ON - Background scraping using FIXED API KEY
        console.log("\n🟢 READ WEBSITE: ON — Starting BACKGROUND website scraping...");

        // RUN SCRAPING IN BACKGROUND, NON-BLOCKING
        void (async () => {
            try {
                await scrapeAndUploadWebsite(
                    {
                        websiteUrl,
                        ragStore: { storeName }
                    },
                    ragService
                );
                console.log("✅ (BACKGROUND) website_content.json scraped & uploaded.");
            } catch (err) {
                console.error("❌ (BACKGROUND) Scraping error:", err);
            }
        })();

        // ADD STORE TO STUDENTS (IF ANY)
        try {
            // Query all students for this university
            const students = await MongoDBHelper.queryDocs(Collections.STUDENTS, [
                ['universityEmail', '==', email]
            ]);

            if (students.length === 0) {
                console.log("ℹ No students found — skipping student updates.");
            } else {
                for (const student of students) {
                    student.accessibleStores = student.accessibleStores || [];

                    const already = student.accessibleStores.some(
                        s => s.storeName === storeName
                    );

                    if (!already) {
                        student.accessibleStores.push({
                            storeName,
                            storeResource
                        });

                        await MongoDBHelper.setDoc(Collections.STUDENTS,
                            MongoDBHelper.sanitizeEmail(student.email),
                            student
                        );
                        console.log(`✔ Added store to student: ${student.email}`);
                    }
                }
            }
        } catch (err) {
            console.error("❌ Student update error:", err);
        }

        // RETURN INSTANTLY — DO NOT WAIT FOR SCRAPING
        return res.json({
            message: "Website enabled. Background scraping started & students updated."
        });

    } catch (error) {
        console.error("toggle-website-access error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// API 5: Get university profile (GET)
router.get('/profile/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const university = await readUniversity(email);
        if (!university) {
            return res.status(404).json({ error: 'University not found' });
        }

        // Return university data without password
        const { password, ...universityData } = university;
        res.json(universityData);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API 6: Update university details (GET)
router.get('/update-profile', async (req, res) => {
    try {
        const { email, ...updates } = req.query;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const university = await readUniversity(email);
        if (!university) {
            return res.status(404).json({ error: 'University not found' });
        }

        // Fields that cannot be updated
        const protectedFields = ['universityId', 'email', 'password', 'createdAt', 'ragStore', 'apiKeyInfo'];

        // Remove protected fields from updates
        protectedFields.forEach(field => {
            if (field in updates) delete updates[field];
        });

        // Parse boolean fields
        if (updates.read_website !== undefined) {
            updates.read_website = updates.read_website === 'true';
        }
        if (updates.isActive !== undefined) {
            updates.isActive = updates.isActive === 'true';
        }

        // Update university
        Object.assign(university, updates, { updatedAt: new Date().toISOString() });

        // Save updated data
        await writeUniversity(email, university);

        const { password, ...universityData } = university;
        res.json({
            message: 'University profile updated successfully',
            university: universityData
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API 7: Delete university (GET)
router.get('/delete-university', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ error: 'email is required' });
        }

        // Load university
        const university = await readUniversity(email);
        if (!university) {
            return res.status(404).json({ error: 'University not found' });
        }

        console.log(`\n========= DELETING UNIVERSITY: ${university.universityName} =========`);

        // 1. DELETE UNIVERSITY RAG STORE using FIXED API KEY
        if (university.ragStore?.storeName) {
            console.log(`Deleting university RAG store: ${university.ragStore.storeName}`);
            await ragService.deleteStore(FIXED_GEMINI_API_KEY, university.ragStore.storeName);
        }

        // 2. DELETE ALL ACCOUNTS (PRIMARY + NON-PRIMARY)
        const accounts = await getUniversityAccounts(email);
        console.log(`Found ${accounts.length} accounts to delete.`);

        for (const acc of accounts) {
            // Delete account RAG store using FIXED API KEY
            if (acc.ragStore?.storeName) {
                console.log(`Deleting account store: ${acc.accountEmail} | ${acc.ragStore.storeName}`);
                await ragService.deleteStore(FIXED_GEMINI_API_KEY, acc.ragStore.storeName);
            }

            // Delete account JSON file
            const sanitized = acc.accountEmail.replace(/[^a-zA-Z0-9@._-]/g, '_');
            const accountPath = path.join(ACCOUNTS_DIR, `${sanitized}.json`);
            await fs.unlink(accountPath);
            console.log(`Deleted account file: ${acc.accountEmail}`);
        }

        // 3. DELETE ALL STUDENTS OF THIS UNIVERSITY
        const students = await MongoDBHelper.queryDocs(Collections.STUDENTS, [
            ['universityEmail', '==', email]
        ]);

        console.log(`Found ${students.length} students to delete.`);

        for (const student of students) {
            const sanitizedEmail = MongoDBHelper.sanitizeEmail(student.email);
            await MongoDBHelper.deleteDoc(Collections.STUDENTS, sanitizedEmail);
            console.log(`Deleted student: ${student.email}`);
        }

        // 4. DELETE UNIVERSITY DOCUMENT
        const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
        await MongoDBHelper.deleteDoc(Collections.UNIVERSITIES, sanitizedEmail);
        console.log(`Deleted university admin document: ${email}`);

        // 5. DELETE PENDING REGISTRATION IF EXISTS
        const pending = await readPendingRegistrations();
        const filtered = pending.filter(p => p.email !== email);
        await writePendingRegistrations(filtered);

        console.log(`Cleaned pending registrations for: ${email}`);
        console.log(`========= UNIVERSITY DELETE COMPLETE =========\n`);

        res.json({
            message: 'University and all associated accounts, students & stores deleted successfully'
        });

    } catch (error) {
        console.error('Delete University error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// ACCOUNT MANAGEMENT APIs (GET VERSION)
// ============================================

// API 8: Create Account (Primary or Non-Primary) (GET)
router.get('/accounts/create', async (req, res) => {
    try {
        const {
            universityEmail,
            accountEmail,
            accountPassword,
            accountName,
            isPrimary
        } = req.query;

        // Validation
        if (!universityEmail || !accountEmail || !accountPassword || !accountName) {
            return res.status(400).json({
                error: 'universityEmail, accountEmail, accountPassword, and accountName are required'
            });
        }

        // Convert isPrimary to boolean
        const isPrimaryBool = isPrimary === 'true';

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(accountEmail)) {
            return res.status(400).json({ error: 'Invalid account email format' });
        }

        // Password strength validation
        if (accountPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        // Check if university exists
        const university = await readUniversity(universityEmail);
        if (!university) {
            return res.status(404).json({ error: 'University not found' });
        }

        // CRITICAL SECURITY CHECK: Prevent account email from being used across multiple universities
        const existsAsUniversity = await universityExists(accountEmail);
        const existingAccount = await readAccount(accountEmail);

        if (existsAsUniversity) {
            return res.status(409).json({ error: 'This email is already registered as a university admin' });
        }

        if (existingAccount) {
            // Check if account belongs to a different university
            if (existingAccount.universityEmail !== universityEmail) {
                return res.status(409).json({
                    error: 'This email is already registered to another university. Each account email must be unique.'
                });
            }
            return res.status(409).json({ error: 'This email is already registered as an account' });
        }

        // Generate accountId FIRST
        const accountId = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Use accountEmail as the store name (no sanitization, no unique suffix)
        const storeName = accountEmail;

        // Create RAG store for the account using FIXED API KEY
        console.log(`Creating RAG store for account: ${accountName} under ${university.universityName}`);
        const ragStoreResult = await ragService.createStore(FIXED_GEMINI_API_KEY, storeName);

        if (!ragStoreResult.success) {
            return res.status(500).json({
                error: `Failed to create document store: ${ragStoreResult.error}`
            });
        }

        const ragStoreResource = ragStoreResult.data.file_search_store_resource;
        console.log(`RAG store created successfully: ${storeName}`);

        // Hash password
        const hashedPassword = await bcrypt.hash(accountPassword, 10);

        // Create account record with accessible stores
        const account = {
            accountId,
            accountEmail,
            password: hashedPassword,
            accountName,
            isPrimary: isPrimaryBool,
            universityEmail,
            universityId: university.universityId,
            universityName: university.universityName,
            ragStore: {
                storeName: storeName,
                storeResource: ragStoreResource,
                createdAt: new Date().toISOString()
            },
            // ADD ACCESSIBLE STORES FOR THE ACCOUNT
            accessibleStores: [
                {
                    storeName: storeName,
                    storeResource: ragStoreResource,
                    isPrimary: true,
                    accessType: 'owner'
                },
                // Add university store if read_website is enabled
                ...(university.read_website ? [{
                    storeName: university.ragStore.storeName,
                    storeResource: university.ragStore.storeResource,
                    isPrimary: false,
                    accessType: 'university_website'
                }] : [])
            ],
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Save account to database
        await writeAccount(accountEmail, account);

        // IF PRIMARY ACCOUNT: Update ALL students of this university to have access
        if (isPrimaryBool) {
            try {
                console.log(`\n🔄 New Primary Account Created: Propagating to valid students of ${universityEmail}...`);
                const students = await MongoDBHelper.queryDocs(Collections.STUDENTS, [
                    ['universityEmail', '==', universityEmail]
                ]);

                if (students.length > 0) {
                    let updatedCount = 0;
                    for (const student of students) {
                        student.accessibleStores = student.accessibleStores || [];

                        // Check if store already exists for student
                        const alreadyExists = student.accessibleStores.some(
                            s => s.storeName === storeName
                        );

                        if (!alreadyExists) {
                            student.accessibleStores.push({
                                storeName: storeName,
                                storeResource: ragStoreResource,
                                accountEmail: accountEmail
                            });

                            // Update student record
                            await MongoDBHelper.setDoc(Collections.STUDENTS,
                                MongoDBHelper.sanitizeEmail(student.email),
                                student
                            );
                            updatedCount++;
                        }
                    }
                    console.log(`✅ Propagated new primary account to ${updatedCount} students.\n`);
                } else {
                    console.log("ℹ No students found to update.");
                }
            } catch (err) {
                console.error("❌ Error propagating primary account to students:", err);
                // Don't fail the request, just log error
            }
        }

        // Return response without password
        const { password, ...accountResponse } = account;

        res.status(201).json({
            message: `${isPrimaryBool ? 'Primary' : 'Non-primary'} account created successfully`,
            account: accountResponse
        });
    } catch (error) {
        console.error('Create account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API 9: Get all accounts for a university (GET)
router.get('/accounts', async (req, res) => {
    try {
        const { universityEmail } = req.query;

        if (!universityEmail) {
            return res.status(400).json({ error: 'universityEmail is required' });
        }

        // Check if university exists
        const university = await readUniversity(universityEmail);
        if (!university) {
            return res.status(404).json({ error: 'University not found' });
        }

        // Get all accounts for this university
        const accounts = await getUniversityAccounts(universityEmail);

        res.json({
            universityEmail,
            universityName: university.universityName,
            accountCount: accounts.length,
            accounts
        });
    } catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API 10: Get account details by email (GET)
router.get('/accounts/detail/:accountEmail', async (req, res) => {
    try {
        // Decode email from URL
        const rawEmail = req.params.accountEmail;
        const accountEmail = decodeURIComponent(rawEmail).trim();

        const { requestingUniversityEmail } = req.query;

        // DEBUG LOG
        console.log("🔍 Fetching account:", accountEmail);

        // Read account from file system
        const account = await readAccount(accountEmail);

        if (!account) {
            console.error("❌ Account file not found for:", accountEmail);
            return res.status(404).json({
                error: 'Account not found',
                accountEmail
            });
        }

        // SECURITY CHECK (ownership)
        if (
            requestingUniversityEmail &&
            account.universityEmail !== requestingUniversityEmail
        ) {
            return res.status(403).json({
                error: 'Access denied. This account belongs to a different university.'
            });
        }

        // Fetch university info (safe)
        const university = await readUniversity(account.universityEmail);

        const universityInfo = university
            ? {
                universityName: university.universityName,
                universityEmail: university.email,
                universityType: university.universityType,
                city: university.city,
                state: university.state,
                country: university.country
            }
            : null;

        // Remove password before sending
        const { password, ...accountData } = account;

        // Success response
        return res.json({
            success: true,
            account: accountData,
            universityInfo
        });

    } catch (error) {
        console.error('❌ Get account details error:', error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// API 11: Update account details (GET)
router.get('/accounts/update', async (req, res) => {
    try {
        const { accountEmail, ...updates } = req.query;

        if (!accountEmail) {
            return res.status(400).json({ error: 'accountEmail is required' });
        }

        const account = await readAccount(accountEmail);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Fields that cannot be updated
        const protectedFields = [
            'accountId',
            'accountEmail',
            'password',
            'universityEmail',
            'universityId',
            'ragStore',
            'createdAt',
            'accessibleStores'
        ];

        // Remove protected fields from updates
        protectedFields.forEach(field => {
            if (field in updates) delete updates[field];
        });

        // Parse boolean fields
        if (updates.isPrimary !== undefined) {
            updates.isPrimary = updates.isPrimary === 'true';
        }
        if (updates.isActive !== undefined) {
            updates.isActive = updates.isActive === 'true';
        }

        // Update account
        Object.assign(account, updates, { updatedAt: new Date().toISOString() });

        // Save updated data
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

// API 12: Delete account (GET)
router.get('/accounts/delete', async (req, res) => {
    try {
        const { accountEmail, universityEmail } = req.query;

        if (!accountEmail || !universityEmail) {
            return res.status(400).json({ error: 'accountEmail and universityEmail are required' });
        }

        // Check if account exists
        const account = await readAccount(accountEmail);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Verify that account belongs to the specified university
        if (account.universityEmail !== universityEmail) {
            return res.status(403).json({
                error: 'This account does not belong to the specified university'
            });
        }

        // Delete account RAG store using FIXED API KEY
        if (account.ragStore?.storeName) {
            console.log(`Deleting account store: ${account.ragStore.storeName}`);
            await ragService.deleteStore(FIXED_GEMINI_API_KEY, account.ragStore.storeName);
        }

        // Delete account file
        const sanitizedEmail = accountEmail.replace(/[^a-zA-Z0-9@._-]/g, '_');
        const filePath = path.join(ACCOUNTS_DIR, `${sanitizedEmail}.json`);
        await fs.unlink(filePath);

        res.json({
            message: 'Account and its RAG store deleted successfully',
            accountEmail: accountEmail
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API 13: Toggle account active status (GET)
router.get('/accounts/toggle-status', async (req, res) => {
    try {
        const { accountEmail, universityEmail } = req.query;

        if (!accountEmail || !universityEmail) {
            return res.status(400).json({ error: 'accountEmail and universityEmail are required' });
        }

        // Check if account exists
        const account = await readAccount(accountEmail);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Verify that account belongs to the specified university
        if (account.universityEmail !== universityEmail) {
            return res.status(403).json({
                error: 'This account does not belong to the specified university'
            });
        }

        // Toggle status
        account.isActive = !account.isActive;
        account.updatedAt = new Date().toISOString();

        // Save updated data
        await writeAccount(accountEmail, account);

        res.json({
            message: `Account ${account.isActive ? 'activated' : 'deactivated'} successfully`,
            accountEmail: accountEmail,
            isActive: account.isActive
        });
    } catch (error) {
        console.error('Toggle account status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API 14: Verify account ownership (GET)
router.get('/accounts/verify-ownership', async (req, res) => {
    try {
        const { accountEmail, universityEmail } = req.query;

        if (!accountEmail || !universityEmail) {
            return res.status(400).json({
                error: 'accountEmail and universityEmail are required'
            });
        }

        // Check if account exists
        const account = await readAccount(accountEmail);
        if (!account) {
            return res.status(404).json({
                error: 'Account not found',
                isOwned: false
            });
        }

        // Verify ownership
        const isOwned = account.universityEmail === universityEmail;

        if (isOwned) {
            res.json({
                message: 'Account belongs to the specified university',
                isOwned: true,
                accountEmail: account.accountEmail,
                accountName: account.accountName,
                universityEmail: account.universityEmail,
                universityName: account.universityName
            });
        } else {
            res.status(403).json({
                message: 'Account belongs to a different university',
                isOwned: false,
                accountEmail: accountEmail
            });
        }
    } catch (error) {
        console.error('Verify account ownership error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// MIGRATION FUNCTION: Add fixed API key to existing universities (Firestore version)
const updateExistingUniversitiesWithFixedKey = async () => {
    try {
        const universities = await MongoDBHelper.getAllDocs(Collections.UNIVERSITIES);
        let updatedCount = 0;

        for (const university of universities) {
            // Add fixed API key if not present or different
            if (!university.apiKeyInfo || university.apiKeyInfo.key !== FIXED_GEMINI_API_KEY) {
                university.apiKeyInfo = {
                    key: FIXED_GEMINI_API_KEY,
                    assignedAt: university.createdAt || new Date().toISOString(),
                    isFixedKey: true
                };
                university.updatedAt = new Date().toISOString();

                const sanitizedEmail = MongoDBHelper.sanitizeEmail(university.email);
                await MongoDBHelper.setDoc(Collections.UNIVERSITIES, sanitizedEmail, university);
                updatedCount++;
                console.log(`✅ Updated university: ${university.email}`);
            }
        }

        console.log(`📊 Updated ${updatedCount} universities with fixed API key`);
    } catch (error) {
        console.error('❌ Error updating universities:', error);
    }
};

// MIGRATION FUNCTION: Add accessibleStores to existing accounts (Firestore version)
const updateExistingAccountsWithAccessibleStores = async () => {
    try {
        const accounts = await MongoDBHelper.getAllDocs(Collections.ACCOUNTS);
        let updatedCount = 0;

        for (const account of accounts) {
            // Add accessibleStores if missing
            if (!account.accessibleStores) {
                // Get university info
                const university = await readUniversity(account.universityEmail);

                const accessibleStores = [
                    {
                        storeName: account.ragStore.storeName,
                        storeResource: account.ragStore.storeResource,
                        isPrimary: true,
                        accessType: 'owner'
                    }
                ];

                // Add university store if read_website is enabled
                if (university && university.read_website && university.ragStore) {
                    accessibleStores.push({
                        storeName: university.ragStore.storeName,
                        storeResource: university.ragStore.storeResource,
                        isPrimary: false,
                        accessType: 'university_website'
                    });
                }

                account.accessibleStores = accessibleStores;
                account.updatedAt = new Date().toISOString();

                const sanitizedEmail = MongoDBHelper.sanitizeEmail(account.accountEmail);
                await MongoDBHelper.setDoc(Collections.ACCOUNTS, sanitizedEmail, account);
                updatedCount++;
                console.log(`✅ Updated account: ${account.accountEmail}`);
            }
        }

        console.log(`📊 Updated ${updatedCount} accounts with accessibleStores`);
    } catch (error) {
        console.error('❌ Error updating accounts:', error);
    }
};

// TEMPORARY MIGRATION ENDPOINT
router.get('/fix-api-keys', async (req, res) => {
    try {
        await updateExistingUniversitiesWithFixedKey();
        res.json({ message: "API keys updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// updateExistingUniversitiesWithFixedKey();
// updateExistingAccountsWithAccessibleStores();

module.exports = router;