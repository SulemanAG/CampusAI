const express = require("express");
const router = express.Router();
const path = require("path");
const RAGService = require("./rag");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { db, Collections, MongoDBHelper } = require('./mongodb');

// DB paths (legacy - kept for reference)
const DB_DIR = path.join(__dirname, "database");
const STUDENTS_DIR = path.join(DB_DIR, "students");
const UNIVERSITIES_DIR = path.join(DB_DIR, "universities");
const CHAT_DIR = path.join(DB_DIR, "chat_sessions");
const PROVIDER_LOGS_DIR = path.join(DB_DIR, "provider_questions");

// No need to create directories with Firestore
// Collections are created automatically

// -------------------- helpers --------------------
async function readStudent(email) {
    try {
        const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
        return await MongoDBHelper.getDoc(Collections.STUDENTS, sanitizedEmail);
    } catch {
        return null;
    }
}

async function readUniversity(email) {
    try {
        const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
        return await MongoDBHelper.getDoc(Collections.UNIVERSITIES, sanitizedEmail);
    } catch {
        return null;
    }
}

function getSessionId(email, sessionId) {
    const safeEmail = MongoDBHelper.sanitizeEmail(email);
    return `${safeEmail}__${sessionId}`;
}

function generateSessionName(question) {
    if (!question || typeof question !== "string") return "New Session";
    const words = question.trim().split(/\s+/);
    return words.length <= 10 ? question.trim() : words.slice(0, 10).join(" ") + "...";
}

// Append message to session document (async)
async function appendMessageToSessionFile(email, sessionId, messageObj) {
    const docId = getSessionId(email, sessionId);
    try {
        let session = await MongoDBHelper.getDoc(Collections.CHAT_SESSIONS, docId);
        if (session) {
            session.messages = session.messages || [];
            session.messages.push(messageObj);
            session.updatedAt = new Date().toISOString();
            await MongoDBHelper.setDoc(Collections.CHAT_SESSIONS, docId, session);
        } else {
            // Create new session if it doesn't exist
            const sessionData = {
                sessionId,
                sessionName: generateSessionName(messageObj.question || ""),
                email,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                messages: [messageObj]
            };
            await MongoDBHelper.setDoc(Collections.CHAT_SESSIONS, docId, sessionData);
        }
    } catch (err) {
        console.error("Error appending message:", err);
    }
}

// Create session document (called synchronously before responding if new)
async function createSessionFile(email, sessionId, sessionName) {
    const docId = getSessionId(email, sessionId);
    const sessionData = {
        sessionId,
        sessionName,
        email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: []
    };
    await MongoDBHelper.setDoc(Collections.CHAT_SESSIONS, docId, sessionData);
}

// Provider logs (store which provider/store was asked + question + answer + timestamp)
async function appendProviderLog(providerEmail, logDoc) {
    try {
        const sanitizedEmail = MongoDBHelper.sanitizeEmail(providerEmail);
        let doc = await MongoDBHelper.getDoc(Collections.PROVIDER_QUESTIONS, sanitizedEmail);

        if (!doc || !doc.logs) {
            doc = { logs: [] };
        }

        doc.logs.push(logDoc);
        doc.updatedAt = new Date().toISOString();

        await MongoDBHelper.setDoc(Collections.PROVIDER_QUESTIONS, sanitizedEmail, doc);
    } catch (err) {
        console.error("appendProviderLog error:", err);
    }
}

// ---------------- GEMINI CLASSIFIER (INTELLIGENT ROUTER) ----------------
const FIXED_GEMINI_API_KEY = "AIzaSyDo6Duj83vQdKyMxdRCgoCO_yccyFFIxCA";

async function classifyStores(stores, question) {
    console.log("=== Gemini Intelligent Router Called ===");
    console.log("Accessible Stores:", stores);
    console.log("Question:", question);

    try {
        const geminiKey = FIXED_GEMINI_API_KEY;
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are an intelligent request router for a university system.
        
AVAILABLE DEPARTMENTS (Stores):
${JSON.stringify(stores, null, 2)}

USER QUESTION: "${question}"

TASK:
Analyze the question and decide which department(s) should answer it.

ROUTING RULES:
1. **SINGLE MATCH**: If the question belongs to ONE specific department, route it there. Use the original question.
2. **MULTI MATCH**: If the question asks about multiple topics (e.g., "fees and syllabus"), split the question and route specific parts to specific departments.
3. **NONE**: If the question is completely irrelevant to ANY department, return "none".

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "type": "single" | "multi" | "none",
  "routes": {
    "store_email_or_name": "specific question for this store"
  }
}

EXAMPLES:
- Q: "What is the CSE syllabus?" -> {"type": "single", "routes": {"cse@uni.edu": "What is the CSE syllabus?"}}
- Q: "Fee structure for CSE and current admission deadline?" -> {"type": "multi", "routes": {"finance@uni.edu": "What is the fee structure for CSE?", "admission@uni.edu": "What is the current admission deadline?"}}
- Q: "Who is the president of Mars?" -> {"type": "none", "routes": {}}

Return ONLY the JSON.`;

        console.log("Calling Gemini Router...");
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        console.log("Gemini Router Raw:", text);

        let jsonStr = text.trim();
        jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonStr = jsonMatch[0];

        const parsed = JSON.parse(jsonStr);
        console.log("Gemini Router Parsed:", parsed);
        return parsed;

    } catch (error) {
        console.error("Gemini Router Error:", error.message);
        // Fallback: Default to broadcasting to all if router fails
        const routes = {};
        stores.forEach(s => routes[s] = question);
        return { type: "multi", routes };
    }
}

// ---------------- GET /ask ----------------
router.get("/ask", async (req, res) => {
    console.log("=== ASK ENDPOINT (INTELLIGENT ROUTER) ===");
    console.log("Time:", new Date().toISOString());

    try {
        const { email, question, sessionId, isCampusSearch } = req.query;

        if (!email || !question) {
            return res.status(400).json({ error: "email & question required" });
        }

        console.log(`📧 User: ${email}`);
        console.log(`❓ Question: ${question}`);

        const student = await readStudent(email);
        if (!student) return res.status(404).json({ error: "Student not found" });

        const accessible = student.accessibleStores || [];
        const accessibleEmails = accessible.map(s => s.accountEmail || s.storeName);
        console.log(`🔍 Accessible stores (${accessibleEmails.length}):`, accessibleEmails);

        // --- DIRECT GEMINI MODE (Non-Campus) ---
        const shouldDoCampusSearch = isCampusSearch !== "false" && isCampusSearch !== false;
        if (!shouldDoCampusSearch) {
            console.log("🚀 === DIRECT GEMINI MODE ===");
            // FIXED API KEY for all calls
            const geminiKey = FIXED_GEMINI_API_KEY;

            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            try {
                const result = await model.generateContent(question);
                const answerText = result.response?.text?.() || "No response from Gemini";

                // Handle session logic
                let isNewSession = false;
                let currentSessionId = sessionId;
                if (!currentSessionId) {
                    isNewSession = true;
                    currentSessionId = "session_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
                }
                const sessionName = isNewSession ? generateSessionName(question) : undefined;

                res.json({
                    sessionId: currentSessionId,
                    answer: answerText,
                    storesUsed: [],
                    grounding: [],
                    isCampusSearch: false,
                    timestamp: new Date().toISOString()
                });

                // Async Logging
                (async () => {
                    try {
                        if (isNewSession) await createSessionFile(email, currentSessionId, sessionName);
                        await appendMessageToSessionFile(email, currentSessionId, {
                            role: "assistant", question, answer: answerText,
                            storesUsed: [], grounding: [], timestamp: new Date().toISOString(),
                            isCampusSearch: false, method: "direct_gemini"
                        });
                    } catch (err) { console.error("background log error:", err); }
                })();
                return;
            } catch (err) {
                console.error("Direct Gemini call error:", err);
                return res.status(500).json({ error: "Failed to call Gemini API" });
            }
        }

        // --- CAMPUS SEARCH MODE (INTELLIGENT ROUTING) ---
        console.log("🏛️ === CAMPUS SEARCH MODE ===");

        if (accessibleEmails.length === 0) {
            return res.json({
                sessionId: sessionId || null,
                answer: "No accessible stores found for your account.",
                isCampusSearch: true
            });
        }

        // 1. ROUTING STEP
        const routingResult = await classifyStores(accessibleEmails, question);
        const { type, routes } = routingResult;

        let finalAnswer = "";
        let finalStoresUsed = [];
        let finalGrounding = [];
        let isFailure = false;

        // 2. EXECUTION STEP
        if (type === 'none') {
            console.log("🚫 Router decided: NONE");
            finalAnswer = "Sorry, we didn't find any information related to your question.";
            isFailure = true;
        } else {
            console.log(`🚀 Router decided: ${type.toUpperCase()} ->`, Object.keys(routes));

            // Map routes to promises
            const searchPromises = Object.entries(routes).map(([store, specificQuery]) => {
                const geminiKey = FIXED_GEMINI_API_KEY; // Always use fixed key
                return RAGService.askQuestion(geminiKey, [store], specificQuery)
                    .then(res => ({ store, result: res, query: specificQuery }))
                    .catch(err => ({ store, error: err }));
            });

            const results = await Promise.all(searchPromises);

            // Filter valid results
            const validResults = results.filter(r => {
                if (!r.result || !r.result.success || !r.result.data) return false;
                const text = r.result.data.response_text || "";
                const lower = text.toLowerCase();
                // Check if RAG returned a failure message
                return !(lower.includes("sorry we didn't find") ||
                    lower.includes("not find any information") ||
                    lower.includes("no information related to"));
            });

            if (validResults.length === 0) {
                finalAnswer = "Sorry, we didn't find any information related to your question.";
                isFailure = true;
            } else {
                // Merge answers
                console.log(`✅ Merging ${validResults.length} valid answers`);

                finalAnswer = validResults.map(r => r.result.data.response_text).join("\n\n");

                validResults.forEach(r => {
                    finalStoresUsed.push(r.store);
                    if (r.result.data.grounding_metadata?.groundingChunks) {
                        const texts = r.result.data.grounding_metadata.groundingChunks
                            .map(g => g.retrievedContext?.text).filter(t => t);
                        finalGrounding.push(...texts);
                    }
                });

                // Limit grounding
                finalGrounding = finalGrounding.slice(0, 5);
            }
        }

        // 3. RESPONSE & LOGGING
        let currentSessionId = sessionId;
        let isNewSession = false;
        if (!currentSessionId) {
            isNewSession = true;
            currentSessionId = "session_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
        }

        res.json({
            sessionId: currentSessionId,
            answer: finalAnswer,
            storesUsed: finalStoresUsed,
            grounding: finalGrounding,
            isCampusSearch: true,
            timestamp: new Date().toISOString()
        });

        // Log Async
        (async () => {
            try {
                if (isNewSession) await createSessionFile(email, currentSessionId, generateSessionName(question));

                // Session log
                await appendMessageToSessionFile(email, currentSessionId, {
                    role: "assistant", question, answer: finalAnswer,
                    storesUsed: finalStoresUsed, timestamp: new Date().toISOString(),
                    isCampusSearch: true, method: `router_${type}`
                });

                // Provider logs (ONLY for actual winners)
                // If multi-match, log to EACH provider
                // Using the specific query that was sent to them!
                if (!isFailure && type !== 'none') {
                    for (const store of finalStoresUsed) {
                        const specificQuery = routes[store] || question; // Fallback to original if route missing (unlikely)

                        // Find matching provider email
                        const dept = accessible.find(s => (s.accountEmail || s.storeName) === store);
                        const providerEmail = dept?.accountEmail || store;

                        if (providerEmail) {
                            await appendProviderLog(providerEmail, {
                                provider_email: providerEmail, user_email: email,
                                store_name: store, question: specificQuery, response: finalAnswer, // Note: logging the *merged* answer might be redundant but safer or we can slice it? User said response same.
                                asked_at: new Date().toISOString(), isCampusSearch: true
                            });
                        }
                    }
                }
            } catch (e) { console.error("Async log error:", e.message); }
        })();

    } catch (err) {
        console.error("ASK endpoint error:", err);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Internal Server Error" });
        }
    }
});

// ------------------------- GET ALL SESSIONS -------------------------
router.get("/sessions/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);

        // Query sessions by email
        const allSessions = await MongoDBHelper.queryDocs(Collections.CHAT_SESSIONS, [
            ['email', '==', email]
        ]);

        const sessions = allSessions.map(session => ({
            sessionId: session.sessionId,
            sessionName: session.sessionName,
            createdAt: session.createdAt
        }));

        sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({ sessions });
    } catch (err) {
        console.error("sessions list err:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ----------------------- GET SPECIFIC SESSION -----------------------
router.get("/session/:email/:sessionId", async (req, res) => {
    try {
        const { email, sessionId } = req.params;
        const docId = getSessionId(email, sessionId);
        const data = await MongoDBHelper.getDoc(Collections.CHAT_SESSIONS, docId);
        if (!data) {
            return res.status(404).json({ error: "Session not found" });
        }
        res.json(data);
    } catch (err) {
        res.status(404).json({ error: "Session not found" });
    }
});

// ----------------------- DELETE SESSION -----------------------
router.get("/session/delete/:email/:sessionId", async (req, res) => {
    try {
        const { email, sessionId } = req.params;
        const docId = getSessionId(email, sessionId);

        const exists = await MongoDBHelper.docExists(Collections.CHAT_SESSIONS, docId);
        if (!exists) {
            return res.status(404).json({ error: "Session not found" });
        }

        await MongoDBHelper.deleteDoc(Collections.CHAT_SESSIONS, docId);
        res.json({
            message: "Session deleted successfully",
            email,
            sessionId
        });
    } catch (err) {
        console.error("Delete session error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ----------------------- DELETE ALL SESSIONS FOR USER -----------------------
router.get("/sessions/delete/all/:email", async (req, res) => {
    try {
        const { email } = req.params;

        // Query all sessions for this user
        const sessions = await MongoDBHelper.queryDocs(Collections.CHAT_SESSIONS, [
            ['email', '==', email]
        ]);

        let deletedCount = 0;
        for (const session of sessions) {
            const docId = getSessionId(email, session.sessionId);
            await MongoDBHelper.deleteDoc(Collections.CHAT_SESSIONS, docId);
            deletedCount++;
        }

        res.json({
            message: `Deleted ${deletedCount} sessions for user`,
            email,
            deletedCount
        });
    } catch (err) {
        console.error("Delete all sessions error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ----------------------- GET PROVIDER LOGS -----------------------
router.get("/provider/logs/:providerEmail", async (req, res) => {
    try {
        const { providerEmail } = req.params;
        const { limit } = req.query;
        const sanitizedEmail = MongoDBHelper.sanitizeEmail(providerEmail);

        try {
            const doc = await MongoDBHelper.getDoc(Collections.PROVIDER_QUESTIONS, sanitizedEmail);
            let logs = doc?.logs || [];

            logs.sort((a, b) => new Date(b.asked_at) - new Date(a.asked_at));
            if (limit && !isNaN(parseInt(limit))) {
                logs = logs.slice(0, parseInt(limit));
            }
            res.json({
                providerEmail,
                totalLogs: doc?.logs?.length || 0,
                logs: logs
            });
        } catch (err) {
            res.json({
                providerEmail,
                totalLogs: 0,
                logs: []
            });
        }
    } catch (err) {
        console.error("Get provider logs error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ----------------------- GET STUDENT SESSION SUMMARY -----------------------
router.get("/session/summary/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const { limit } = req.query;

        // Query all sessions for this user
        const allSessions = await MongoDBHelper.queryDocs(Collections.CHAT_SESSIONS, [
            ['email', '==', email]
        ]);

        const sessions = allSessions.map(session => ({
            sessionId: session.sessionId,
            sessionName: session.sessionName,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt || session.createdAt,
            messageCount: session.messages ? session.messages.length : 0
        }));

        sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        let finalSessions = sessions;
        if (limit && !isNaN(parseInt(limit))) {
            finalSessions = sessions.slice(0, parseInt(limit));
        }

        res.json({
            email,
            totalSessions: sessions.length,
            sessions: finalSessions
        });
    } catch (err) {
        console.error("Get session summary error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;