const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { db, Collections, MongoDBHelper } = require('./mongodb');

// ------------------------------
// Helper Functions
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

const readStudent = async (email) => {
    try {
        const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
        return await MongoDBHelper.getDoc(Collections.STUDENTS, sanitizedEmail);
    } catch {
        return null;
    }
};

const writeStudent = async (email, data) => {
    const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
    await MongoDBHelper.setDoc(Collections.STUDENTS, sanitizedEmail, data);
};

// ------------------------------
// Core SmartSolve Processing Function
// ------------------------------
async function processSmartSolve(accountEmail) {
    console.log(`🧠 SmartSolve: Starting processing for ${accountEmail}`);

    try {
        // 1. Get account details
        const account = await readAccount(accountEmail);
        if (!account) {
            console.error(`❌ SmartSolve: Account not found: ${accountEmail}`);
            return;
        }

        // 2. Get all unsolved (pending) tickets for this account
        const unsolvedTickets = await MongoDBHelper.queryDocs(Collections.TICKETS, [
            ['accountEmail', '==', accountEmail],
            ['status', '==', 'pending']
        ]);

        console.log(`📊 SmartSolve: Found ${unsolvedTickets.length} unsolved tickets for ${accountEmail}`);

        // 3. Check if ticket count > 4
        if (unsolvedTickets.length <= 4) {
            console.log(`⏭️ SmartSolve: Not enough tickets (${unsolvedTickets.length} <= 4). Skipping clustering.`);
            return;
        }

        // 4. Get university API key for Gemini
        // 4. Get university API key for Gemini
        // FIXED KEY implementation as requested
        const FIXED_KEY = "AIzaSyDo6Duj83vQdKyMxdRCgoCO_yccyFFIxCA";
        const geminiKey = FIXED_KEY;

        // 5. Prepare ticket data for clustering
        const ticketTexts = unsolvedTickets.map((ticket, index) => ({
            index: index,
            ticketId: ticket.ticketId,
            problem: ticket.problem,
            studentEmail: ticket.studentEmail,
            createdAt: ticket.createdAt
        }));

        console.log(`🔍 SmartSolve: Sending ${ticketTexts.length} tickets to Gemini for clustering...`);

        // 6. Call Gemini for clustering
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const clusteringPrompt = `You are a smart ticket clustering AI. Analyze the following support tickets and group them by similar meaning/intent.

TICKETS:
${JSON.stringify(ticketTexts, null, 2)}

TASK:
1. Group tickets that are asking the SAME or VERY SIMILAR questions (meaning-wise)
2. For each cluster, create a summarized question that represents all tickets in that group
3. For unique tickets (not similar to any other), create individual entries
4. Assign a simple numeric unique ID (1, 2, 3, etc.) for each cluster/question

IMPORTANT RULES:
- Be strict about similarity - only cluster tickets that are truly asking the same thing
- The summarized question should be clear and comprehensive
- Keep track of which ticket IDs belong to which cluster
- Each unique question gets a unique numeric ID starting from 1

OUTPUT FORMAT (ONLY VALID JSON):
{
  "clusters": [
    {
      "uniqueId": 1,
      "summarizedQuestion": "Clear summary of the common question",
      "ticketIds": ["ticket_xxx", "ticket_yyy"],
      "ticketCount": 2,
      "category": "brief category name"
    },
    {
      "uniqueId": 2,
      "summarizedQuestion": "Another summarized question",
      "ticketIds": ["ticket_zzz"],
      "ticketCount": 1,
      "category": "brief category name"
    }
  ],
  "totalOriginalTickets": ${ticketTexts.length},
  "totalClusters": <number of clusters>,
  "reductionPercentage": <percentage of reduction>
}

Return ONLY the JSON, no other text or explanation.`;

        const result = await model.generateContent([
            clusteringPrompt
        ], {
            generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json"
            }
        });

        const responseText = result.response?.text?.() || "";
        console.log(`✅ SmartSolve: Received clustering response`);

        // 7. Parse clustering result
        let clusteringData;
        try {
            // Remove markdown code blocks if present
            const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            clusteringData = JSON.parse(cleanJson);
        } catch (parseErr) {
            console.error(`❌ SmartSolve: Failed to parse Gemini response:`, parseErr);
            console.error(`Response was:`, responseText.substring(0, 500));
            return;
        }

        if (!clusteringData.clusters || !Array.isArray(clusteringData.clusters)) {
            console.error(`❌ SmartSolve: Invalid clustering data structure`);
            return;
        }

        console.log(`📦 SmartSolve: Created ${clusteringData.totalClusters} clusters from ${clusteringData.totalOriginalTickets} tickets`);
        console.log(`📉 SmartSolve: Reduction: ${clusteringData.reductionPercentage}%`);

        // 8. Store in account's smartSolveQuestions field
        account.smartSolveQuestions = {
            clusters: clusteringData.clusters,
            totalOriginalTickets: clusteringData.totalOriginalTickets,
            totalClusters: clusteringData.totalClusters,
            reductionPercentage: clusteringData.reductionPercentage,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active'
        };

        await writeAccount(accountEmail, account);
        console.log(`💾 SmartSolve: Saved clustering results to account ${accountEmail}`);

        console.log(`✅ SmartSolve: Processing completed successfully for ${accountEmail}`);

    } catch (error) {
        console.error(`❌ SmartSolve: Error processing ${accountEmail}:`, error);
    }
}

// ------------------------------
// Trigger SmartSolve Processing (called by SSE API)
// ------------------------------
function triggerSmartSolve(accountEmail) {
    // Run in background without blocking
    setImmediate(() => {
        processSmartSolve(accountEmail).catch(err => {
            console.error(`❌ SmartSolve background error for ${accountEmail}:`, err);
        });
    });
    console.log(`🚀 SmartSolve: Triggered background processing for ${accountEmail}`);
}

// ------------------------------
// API 1: Get Smart Solve Tickets (GET)
// ------------------------------
router.get('/getsmartsolveticket', async (req, res) => {
    try {
        const { accountEmail } = req.query;

        if (!accountEmail) {
            return res.status(400).json({ error: "accountEmail is required" });
        }

        const account = await readAccount(accountEmail);
        if (!account) {
            return res.status(404).json({ error: "Account not found" });
        }

        if (!account.smartSolveQuestions) {
            return res.status(404).json({
                error: "No smart solve questions available",
                message: "Either not enough tickets or clustering hasn't been processed yet"
            });
        }

        const smartSolve = account.smartSolveQuestions;

        // Format response
        const response = {
            accountEmail,
            status: smartSolve.status || 'active',
            summary: {
                totalOriginalTickets: smartSolve.totalOriginalTickets,
                totalClusters: smartSolve.totalClusters,
                reductionPercentage: smartSolve.reductionPercentage,
                ticketsToSolve: smartSolve.totalClusters
            },
            clusteredQuestions: smartSolve.clusters.map(cluster => ({
                uniqueId: cluster.uniqueId,
                question: cluster.summarizedQuestion,
                category: cluster.category,
                affectedTickets: cluster.ticketCount,
                ticketIds: cluster.ticketIds
            })),
            createdAt: smartSolve.createdAt,
            updatedAt: smartSolve.updatedAt
        };

        res.json(response);

    } catch (err) {
        console.error("Get smart solve tickets error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------------------
// API 2: Solve Smart Tickets (GET)
// ------------------------------
router.get('/solveSmartTickets', async (req, res) => {
    try {
        const { accountEmail, solutions } = req.query;

        // Parse solutions if it's a JSON string
        let parsedSolutions;
        try {
            parsedSolutions = typeof solutions === 'string' ? JSON.parse(solutions) : solutions;
        } catch (parseErr) {
            return res.status(400).json({
                error: "solutions must be a valid JSON string",
                example: '[{"uniqueId":1,"solution":"Your solution here"}]'
            });
        }

        // Validate input
        if (!accountEmail || !parsedSolutions || !Array.isArray(parsedSolutions)) {
            return res.status(400).json({
                error: "accountEmail and solutions array are required",
                format: {
                    accountEmail: "string",
                    solutions: [
                        {
                            uniqueId: "number",
                            solution: "string"
                        }
                    ]
                }
            });
        }

        const account = await readAccount(accountEmail);
        if (!account) {
            return res.status(404).json({ error: "Account not found" });
        }

        if (!account.smartSolveQuestions) {
            return res.status(404).json({ error: "No smart solve questions found for this account" });
        }

        const smartSolve = account.smartSolveQuestions;
        const clusters = smartSolve.clusters;

        // Validate all uniqueIds exist
        const providedIds = parsedSolutions.map(s => s.uniqueId);
        const validIds = clusters.map(c => c.uniqueId);
        const invalidIds = providedIds.filter(id => !validIds.includes(id));

        if (invalidIds.length > 0) {
            return res.status(400).json({
                error: "Invalid uniqueId(s) provided",
                invalidIds,
                validIds
            });
        }

        console.log(`🎯 SmartSolve: Processing solutions for ${accountEmail}`);
        console.log(`📝 SmartSolve: Received ${parsedSolutions.length} solutions`);

        const results = {
            accountEmail,
            totalSolutionsProvided: parsedSolutions.length,
            totalTicketsUpdated: 0,
            solvedClusters: [],
            errors: []
        };

        // Process each solution
        for (const solutionData of parsedSolutions) {
            const { uniqueId, solution } = solutionData;

            if (!solution || solution.trim().length === 0) {
                results.errors.push({
                    uniqueId,
                    error: "Solution cannot be empty"
                });
                continue;
            }

            // Find the cluster
            const cluster = clusters.find(c => c.uniqueId === uniqueId);
            if (!cluster) {
                results.errors.push({
                    uniqueId,
                    error: "Cluster not found"
                });
                continue;
            }

            // Get all ticket IDs for this cluster
            const ticketIds = cluster.ticketIds;
            const updatedTickets = [];
            const failedTickets = [];

            console.log(`📋 SmartSolve: Solving cluster ${uniqueId} affecting ${ticketIds.length} tickets`);

            // Update each ticket
            for (const ticketId of ticketIds) {
                try {
                    const ticket = await readTicket(ticketId);
                    if (!ticket) {
                        failedTickets.push({
                            ticketId,
                            reason: "Ticket not found"
                        });
                        continue;
                    }

                    // Update ticket
                    ticket.solution = solution;
                    ticket.status = "completed";
                    ticket.updatedAt = new Date().toISOString();
                    ticket.solvedViaSmartSolve = true;
                    ticket.smartSolveClusterId = uniqueId;

                    await writeTicket(ticketId, ticket);
                    updatedTickets.push(ticketId);
                    results.totalTicketsUpdated++;

                    // Also update in student's records (if needed)
                    try {
                        const student = await readStudent(ticket.studentEmail);
                        if (student && student.tickets) {
                            const studentTicketIndex = student.tickets.findIndex(t => t.ticketId === ticketId);
                            if (studentTicketIndex !== -1) {
                                student.tickets[studentTicketIndex].solution = solution;
                                student.tickets[studentTicketIndex].status = "completed";
                                student.tickets[studentTicketIndex].updatedAt = new Date().toISOString();
                                await writeStudent(ticket.studentEmail, student);
                            }
                        }
                    } catch (studentUpdateErr) {
                        console.warn(`⚠️ SmartSolve: Could not update student record for ticket ${ticketId}:`, studentUpdateErr.message);
                    }

                } catch (ticketErr) {
                    failedTickets.push({
                        ticketId,
                        reason: ticketErr.message
                    });
                }
            }

            results.solvedClusters.push({
                uniqueId,
                question: cluster.summarizedQuestion,
                category: cluster.category,
                totalTickets: ticketIds.length,
                successfullyUpdated: updatedTickets.length,
                failed: failedTickets.length,
                updatedTickets,
                failedTickets
            });

            console.log(`✅ SmartSolve: Cluster ${uniqueId} - Updated ${updatedTickets.length}/${ticketIds.length} tickets`);
        }

        // Automatically clear smart solve questions after successful processing
        delete account.smartSolveQuestions;
        await writeAccount(accountEmail, account);

        console.log(`🎉 SmartSolve: Completed! Updated ${results.totalTicketsUpdated} tickets total`);

        res.json({
            message: "Smart solve processing completed",
            results
        });

    } catch (err) {
        console.error("Solve smart tickets error:", err);
        res.status(500).json({
            error: "Internal server error",
            details: err.message
        });
    }
});

// ------------------------------
// API 3: Clear Smart Solve Questions (GET)
// ------------------------------
router.get('/clearSmartSolve', async (req, res) => {
    try {
        const { accountEmail } = req.query;

        if (!accountEmail) {
            return res.status(400).json({ error: "accountEmail is required" });
        }

        const account = await readAccount(accountEmail);
        if (!account) {
            return res.status(404).json({ error: "Account not found" });
        }

        if (!account.smartSolveQuestions) {
            return res.status(404).json({ error: "No smart solve questions to clear" });
        }

        delete account.smartSolveQuestions;
        await writeAccount(accountEmail, account);

        res.json({
            message: "Smart solve questions cleared successfully",
            accountEmail
        });

    } catch (err) {
        console.error("Clear smart solve error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Export both router and trigger function
module.exports = {
    router,
    triggerSmartSolve
};
