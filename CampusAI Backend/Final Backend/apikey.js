const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs").promises;
const RAGService = require("./rag");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// DB paths
const DB_DIR = path.join(__dirname, "database");
const STUDENTS_DIR = path.join(DB_DIR, "students");
const UNIVERSITIES_DIR = path.join(DB_DIR, "universities");
const CHAT_DIR = path.join(DB_DIR, "chat_sessions");
const PROVIDER_LOGS_DIR = path.join(DB_DIR, "provider_questions");

// ensure directories
(async () => {
    await fs.mkdir(CHAT_DIR, { recursive: true });
    await fs.mkdir(PROVIDER_LOGS_DIR, { recursive: true });
})();

// -------------------- helpers --------------------
async function readStudent(email) {
    try {
        const safe = email.replace(/[^a-zA-Z0-9@._-]/g, "_");
        const file = path.join(STUDENTS_DIR, safe + ".json");
        return JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
        return null;
    }
}

async function readUniversity(email) {
    try {
        const safe = email.replace(/[^a-zA-Z0-9@._-]/g, "_");
        const file = path.join(UNIVERSITIES_DIR, safe + ".json");
        return JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
        return null;
    }
}

function getSessionFile(email, sessionId) {
    const safeEmail = email.replace(/[^a-zA-Z0-9@._-]/g, "_");
    return path.join(CHAT_DIR, `${safeEmail}__${sessionId}.json`);
}

function generateSessionName(question) {
    if (!question || typeof question !== "string") return "New Session";
    const words = question.trim().split(/\s+/);
    return words.length <= 10 ? question.trim() : words.slice(0, 10).join(" ") + "...";
}

// Append message to session file (async)
async function appendMessageToSessionFile(email, sessionId, messageObj) {
    const file = getSessionFile(email, sessionId);
    try {
        let session = JSON.parse(await fs.readFile(file, "utf8"));
        session.messages = session.messages || [];
        session.messages.push(messageObj);
        session.updatedAt = new Date().toISOString();
        await fs.writeFile(file, JSON.stringify(session, null, 2));
    } catch (err) {
        // if session file missing, create one
        const sessionData = {
            sessionId,
            sessionName: generateSessionName(messageObj.question || ""),
            email,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [messageObj]
        };
        await fs.writeFile(file, JSON.stringify(sessionData, null, 2));
    }
}

// Create session file (called synchronously before responding if new)
async function createSessionFile(email, sessionId, sessionName) {
    const file = getSessionFile(email, sessionId);
    const sessionData = {
        sessionId,
        sessionName,
        email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: []
    };
    await fs.writeFile(file, JSON.stringify(sessionData, null, 2));
}

// Provider logs (store which provider/store was asked + question + answer + timestamp)
async function appendProviderLog(providerEmail, logDoc) {
    try {
        const safe = providerEmail.replace(/[^a-zA-Z0-9@._-]/g, "_");
        const file = path.join(PROVIDER_LOGS_DIR, `${safe}.json`);
        let arr = [];
        try {
            arr = JSON.parse(await fs.readFile(file, "utf8"));
            if (!Array.isArray(arr)) arr = [];
        } catch {
            arr = [];
        }
        arr.push(logDoc);
        await fs.writeFile(file, JSON.stringify(arr, null, 2));
    } catch (err) {
        console.error("appendProviderLog error:", err);
    }
}

// ---------------- GEMINI CLASSIFIER (improved system prompt) ----------------
async function classifyStores(geminiKey, stores, question) {
    try {
        console.log("classifyStores called with key:", geminiKey ? "Present" : "Missing");
        console.log("Stores:", stores);
        console.log("Question:", question);

        if (!geminiKey) {
            console.log("No Gemini key, returning all stores");
            // fallback: return all stores with no splitting
            return { stores: stores, split_questions: {}, unanswered: [] };
        }

        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Changed to more common model

        // TIGHT system prompt — explicit JSON only, deterministic, temperature 0
        // RELAXED system prompt — encourages matching even if store names are emails
        const SYSTEM_PROMPT = `
You are a helpful routing assistant. INPUT:
- stores list (names only): ${JSON.stringify(stores)}
- user's question (provided as the user content)

TASK:
1) Decide which of the stores from the list is best suited to answer the user's question.
   - IMPORTANT: Store names may be email addresses (e.g., "admission@univ.edu"). Focus on the part before the "@" to determine the department (e.g., "admission").
   - BE LENIENT: If a store seems even slightly relevant, include it. It is better to check a store and find nothing than to skip it.
2) If some part belongs to a store, rewrite that part clearly and put it in split_questions under that store name.
3) If a part belongs to multiple stores, include it under all relevant store keys.
4) If a part cannot be answered by any store, include that part in "unanswered" with a short "reason".

OUTPUT REQUIREMENTS (must output only valid JSON, nothing else):
{
  "stores": ["store1","store2"],               // exact store names from the provided list
  "split_questions": {                         // mapping store -> rewritten question part
     "store1": "rewritten part for store1"
  },
  "unanswered": [                              // list of {text, reason}
     { "text": "original part text", "reason": "why no store can answer" }
  ]
}

If NO store can answer, return:
{
  "stores": [],
  "split_questions": {},
  "unanswered": [{ "text": "<full question>", "reason": "No department can answer this" }]
}

Do NOT return any extra text, commentary, or explanation. Return valid JSON only.
`.trim();

        console.log("Calling Gemini for classification...");
        const result = await model.generateContent({
            contents: question,
            system_instruction: SYSTEM_PROMPT,
            generationConfig: { temperature: 0.0 }
        });

        // extract text safely
        const txt = result.response?.text?.() || (result.candidates && result.candidates[0] && result.candidates[0].text) || "";
        console.log("Classification raw response:", txt.substring(0, 200) + "...");

        if (!txt) {
            console.log("Empty response from classification");
            return { stores: [], split_questions: {}, unanswered: [] };
        }

        // Parse JSON — try direct parse, otherwise extract substring
        const raw = txt.trim();
        try {
            const parsed = JSON.parse(raw);
            console.log("Classification parsed successfully:", parsed);
            return parsed;
        } catch (e) {
            console.log("JSON parse failed, trying substring extraction");
            const start = raw.indexOf("{");
            const end = raw.lastIndexOf("}");
            if (start !== -1 && end !== -1) {
                try {
                    const parsed = JSON.parse(raw.slice(start, end + 1));
                    console.log("Classification parsed after substring extraction:", parsed);
                    return parsed;
                } catch (e2) {
                    console.warn("classifyStores: JSON parse failed after substring:", e2.message);
                }
            }
        }

        // if parse fails, fallback: treat all stores as selected without splitting
        console.log("Classification failed, returning all stores as fallback");
        return { stores: stores, split_questions: {}, unanswered: [] };
    } catch (err) {
        console.error("classifyStores error:", err.message);
        return { stores: stores, split_questions: {}, unanswered: [] };
    }
}

// ---------------- GET /ask (DEPRECATED - Moved to ask.js) ----------------
// router.get("/ask", async (req, res) => {
//     // ... logic moved to ask.js ...
//     res.status(410).json({ error: "Endpoint deprecated. Please check app.js configuration." });
// });

// ------------------------- GET ALL SESSIONS -------------------------
router.get("/sessions/:email", async (req, res) => {
    try {
        console.log("📋 Getting sessions for:", req.params.email);
        const { email } = req.params;
        const safePrefix = email.replace(/[^a-zA-Z0-9@._-]/g, "_");
        const files = await fs.readdir(CHAT_DIR);
        const sessions = [];

        for (const file of files) {
            if (file.startsWith(safePrefix + "__")) {
                try {
                    const data = JSON.parse(await fs.readFile(path.join(CHAT_DIR, file), "utf8"));
                    sessions.push({
                        sessionId: data.sessionId,
                        sessionName: data.sessionName,
                        createdAt: data.createdAt,
                        messageCount: data.messages?.length || 0
                    });
                } catch { /* skip invalid */ }
            }
        }
        // sort newest first
        sessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        console.log(`📋 Found ${sessions.length} sessions for ${email}`);
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
        console.log(`📖 Getting session ${sessionId} for ${email}`);
        const file = getSessionFile(email, sessionId);
        const data = JSON.parse(await fs.readFile(file, "utf8"));
        console.log(`📖 Session found with ${data.messages?.length || 0} messages`);
        res.json(data);
    } catch (err) {
        console.error("Get session error:", err.message);
        res.status(404).json({ error: "Session not found" });
    }
});

// ----------------------- DELETE SESSION -----------------------
router.get("/session/delete/:email/:sessionId", async (req, res) => {
    try {
        const { email, sessionId } = req.params;
        console.log(`🗑️ Deleting session ${sessionId} for ${email}`);
        const file = getSessionFile(email, sessionId);

        await fs.access(file);
        await fs.unlink(file);

        console.log(`✅ Session deleted: ${sessionId}`);
        res.json({
            message: "Session deleted successfully",
            email,
            sessionId
        });
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log(`❌ Session not found: ${req.params.sessionId}`);
            res.status(404).json({ error: "Session not found" });
        } else {
            console.error("Delete session error:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    }
});

// ----------------------- DELETE ALL SESSIONS FOR USER -----------------------
router.get("/sessions/delete/all/:email", async (req, res) => {
    try {
        const { email } = req.params;
        console.log(`🗑️ Deleting all sessions for: ${email}`);
        const safePrefix = email.replace(/[^a-zA-Z0-9@._-]/g, "_");
        const files = await fs.readdir(CHAT_DIR);
        let deletedCount = 0;

        for (const file of files) {
            if (file.startsWith(safePrefix + "__")) {
                try {
                    await fs.unlink(path.join(CHAT_DIR, file));
                    deletedCount++;
                    console.log(`   Deleted: ${file}`);
                } catch { /* skip errors */ }
            }
        }

        console.log(`✅ Deleted ${deletedCount} sessions for ${email}`);
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
        console.log(`📊 Getting logs for provider: ${providerEmail}`);

        const safeEmail = providerEmail.replace(/[^a-zA-Z0-9@._-]/g, "_");
        const file = path.join(PROVIDER_LOGS_DIR, `${safeEmail}.json`);

        try {
            const data = JSON.parse(await fs.readFile(file, "utf8"));
            let logs = data;

            // Sort by most recent first
            logs.sort((a, b) => new Date(b.asked_at) - new Date(a.asked_at));

            // Apply limit if provided
            if (limit && !isNaN(parseInt(limit))) {
                logs = logs.slice(0, parseInt(limit));
            }

            console.log(`📊 Found ${data.length} logs for ${providerEmail}`);
            res.json({
                providerEmail,
                totalLogs: data.length,
                logs: logs
            });
        } catch (err) {
            // File doesn't exist or is empty
            console.log(`📊 No logs found for ${providerEmail}`);
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
        console.log(`📈 Getting session summary for: ${email}`);

        const safePrefix = email.replace(/[^a-zA-Z0-9@._-]/g, "_");
        const files = await fs.readdir(CHAT_DIR);
        const sessions = [];

        for (const file of files) {
            if (file.startsWith(safePrefix + "__")) {
                try {
                    const data = JSON.parse(await fs.readFile(path.join(CHAT_DIR, file), "utf8"));
                    const messageCount = data.messages ? data.messages.length : 0;
                    const lastUpdated = data.updatedAt || data.createdAt;

                    sessions.push({
                        sessionId: data.sessionId,
                        sessionName: data.sessionName,
                        createdAt: data.createdAt,
                        updatedAt: lastUpdated,
                        messageCount: messageCount
                    });
                } catch { /* skip invalid */ }
            }
        }

        // sort newest first
        sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        // Apply limit if provided
        let finalSessions = sessions;
        if (limit && !isNaN(parseInt(limit))) {
            finalSessions = sessions.slice(0, parseInt(limit));
        }

        console.log(`📈 Found ${sessions.length} sessions for ${email}`);
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