const { db, Collections, MongoDBHelper } = require('./mongodb');
const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * RAG Service for Local MongoDB File Search Integration
 * Replaces external Gemini RAG API with local storage.
 */
class RAGService {
    constructor() {
        // No baseURL needed anymore
        this.STORES_COLLECTION = Collections.RAG_STORES;
        this.DOCUMENTS_COLLECTION = Collections.RAG_DOCUMENTS;
    }

    /**
     * Create a new store in MongoDB
     * @param {string} apiKey - Gemini API key (Ignored for local storage, kept for compatibility)
     * @param {string} storeName - Name of the store to create
     * @returns {Promise<Object>} Store creation response
     */
    async createStore(apiKey, storeName) {
        try {
            // Check if store already exists
            const existingStore = await MongoDBHelper.queryDocs(this.STORES_COLLECTION, [
                ['store_name', '==', storeName]
            ]);

            if (existingStore.length > 0) {
                // If it exists, return it acting like a creation or retrieval
                return {
                    success: true,
                    data: {
                        name: `stores/${existingStore[0].id}`, // Simulate resource name
                        store_name: existingStore[0].store_name,
                        file_search_store_resource: {
                            name: `stores/${existingStore[0].id}`,
                            file_search_store_id: existingStore[0].id
                        }
                    }
                };
            }

            // Create new store
            const storeId = `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newStore = {
                store_name: storeName,
                created_at: new Date().toISOString(),
                file_search_store_id: storeId
            };

            await MongoDBHelper.setDoc(this.STORES_COLLECTION, storeId, newStore);

            return {
                success: true,
                data: {
                    name: `stores/${storeId}`,
                    store_name: storeName,
                    file_search_store_resource: {
                        name: `stores/${storeId}`,
                        file_search_store_id: storeId
                    }
                }
            };
        } catch (error) {
            console.error('Error creating store:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Upload files to a specific store (Stores extracted text in MongoDB)
     * @param {string} apiKey - Gemini API key (Ignored)
     * @param {string} storeName - Name of the store
     * @param {Array} files - Array of file buffers or paths
     * @param {boolean} limit - Whether to enforce file size limit (default: true)
     * @returns {Promise<Object>} Upload response
     */
    async uploadFiles(apiKey, storeName, files, limit = true) {
        try {
            // Ensure store exists (optional, or just use name)
            // For simply storing text, we might not strictly need the parent store object 
            // if we just query by storeName, but good to check.

            const uploadedDocs = [];

            for (const file of files) {
                let textContent = '';
                let filename = '';

                if (file.buffer && file.originalname) {
                    filename = file.originalname;
                    // Assume extracted text is passed in buffer (as per previous logic in accounts.js)
                    // or we try to convert it. 
                    // accounts.js sends: uploadBuffer = Buffer.from(convertedText, 'utf-8'); 
                    // So we can safely assume utf-8 string.
                    textContent = file.buffer.toString('utf-8');
                } else if (file.path && file.filename) {
                    // This path is less used in current code but handling just in case
                    const fs = require('fs');
                    filename = file.filename;
                    textContent = fs.readFileSync(file.path, 'utf-8');
                }

                if (!textContent) continue;

                // Clean text: Remove extra spaces/newlines to make it perfect context
                textContent = textContent.replace(/\s+/g, ' ').trim();

                const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                const newDoc = {
                    document_id: docId,
                    store_name: storeName,
                    file_name: filename,
                    content: textContent,
                    created_at: new Date().toISOString()
                };

                await MongoDBHelper.setDoc(this.DOCUMENTS_COLLECTION, docId, newDoc);

                uploadedDocs.push({
                    name: `stores/${storeName}/documents/${docId}`,
                    display_name: filename,
                    document_id: docId
                });
            }

            return {
                success: true,
                data: {
                    processed_files: uploadedDocs
                }
            };
        } catch (error) {
            console.error('Error uploading files:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * List all stores
     * @param {string} apiKey - Gemini API key
     * @returns {Promise<Object>} List of stores
     */
    async listStores(apiKey) {
        try {
            const stores = await MongoDBHelper.getAllDocs(this.STORES_COLLECTION);

            // Format to match external API response structure
            const formattedStores = stores.map(store => ({
                name: `stores/${store.id}`,
                store_name: store.store_name,
                created_at: store.created_at,
                file_search_store_id: store.id
                // Note: syncing 'files' inside here (like count) would require a separate query
                // but checking original 'getStoreStats', it relies on this.
                // We'll leave files array empty or implement if needed. 
                // Original usage just checked existence mostly.
            }));

            return {
                success: true,
                data: {
                    stores: formattedStores
                }
            };
        } catch (error) {
            console.error('Error listing stores:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete a document from a store
     * @param {string} apiKey - Gemini API key
     * @param {string} storeName - Name of the store
     * @param {string} documentId - Document ID to delete
     * @returns {Promise<Object>} Deletion response
     */
    async deleteDocument(apiKey, storeName, documentId) {
        try {
            await MongoDBHelper.deleteDoc(this.DOCUMENTS_COLLECTION, documentId);
            return {
                success: true,
                data: {
                    deleted: true,
                    document_id: documentId
                }
            };
        } catch (error) {
            console.error('Error deleting document:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete an entire store
     * @param {string} apiKey - Gemini API key
     * @param {string} storeName - Name of the store to delete
     * @returns {Promise<Object>} Deletion response
     */
    async deleteStore(apiKey, storeName) {
        try {
            // Find store by name to get ID
            const stores = await MongoDBHelper.queryDocs(this.STORES_COLLECTION, [
                ['store_name', '==', storeName]
            ]);

            for (const store of stores) {
                await MongoDBHelper.deleteDoc(this.STORES_COLLECTION, store.id);
            }

            // Also delete all documents associated with this store
            const docs = await MongoDBHelper.queryDocs(this.DOCUMENTS_COLLECTION, [
                ['store_name', '==', storeName]
            ]);

            for (const doc of docs) {
                await MongoDBHelper.deleteDoc(this.DOCUMENTS_COLLECTION, doc.id);
            }

            return {
                success: true,
                data: {
                    deleted: true,
                    store_name: storeName
                }
            };
        } catch (error) {
            console.error('Error deleting store:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Ask a question using RAG (Retrieval Augmented Generation)
     * @param {string} apiKey - Gemini API key
     * @param {Array<string>} stores - Array of store names to query (only first used for now)
     * @param {string} question - Question to ask
     * @param {string} systemPrompt - Optional system prompt
     * @returns {Promise<Object>} Answer response
     */
    async askQuestion(apiKey, stores, question, systemPrompt = null) {
        try {
            console.log(`[RAG Local] Asking question on stores:`, stores);

            // 1. Fetch Context from MongoDB
            const targetStore = stores[0]; // Assuming single store per call parallelized by ask.js
            const docs = await MongoDBHelper.queryDocs(this.DOCUMENTS_COLLECTION, [
                ['store_name', '==', targetStore]
            ]);

            console.log(`[RAG Local] Found ${docs.length} documents for store: ${targetStore}`);

            // Concatenate context
            // Increased limit for Gemini 1.5 Flash (1M token window)
            // 800,000 characters is roughly 200k tokens, plenty of room.
            let context = "";
            for (const doc of docs) {
                if (doc.content) {
                    context += `\n--- Document: ${doc.file_name} ---\n${doc.content}\n`;
                }
            }

            if (!context.trim()) {
                console.log("[RAG Local] No context found.");
                return {
                    success: true,
                    data: {
                        answer: "Sorry, we didn't find any information related to your question.",
                        response_text: "Sorry, we didn't find any information related to your question.",
                        source_documents: []
                    }
                };
            }

            // 2. Prepare Gemini Prompt
            const FIXED_KEY = "AIzaSyDo6Duj83vQdKyMxdRCgoCO_yccyFFIxCA";
            const genAI = new GoogleGenerativeAI(FIXED_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const prompt = `You are an intelligent assistant for a university. 
            
CONTEXT:
${context.substring(0, 800000)} 

USER QUESTION: "${question}"

INSTRUCTIONS:
1. Search the CONTEXT above for the answer to the USER QUESTION.
2. Is the answer present in the CONTEXT?
   - If YES: Return a nice, easy-to-understand answer. Not very long, not very short. Just the answer.
   - If NO: Return strictly just the single word: "No".
3. Do not mention "context" or "provided text" in your answer. Just answer the question directly.`;

            // 3. Call Gemini API
            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();

            // 4. Handle "No" case
            // ask.js looks for specific failure phrases to determine if it should pick this answer.
            // If Gemini says "No", we return a standard failure message.
            if (responseText.toLowerCase().replace(/[^a-z]/g, '') === 'no') {
                console.log("[RAG Local] Gemini returned 'No'.");
                return {
                    success: true,
                    data: {
                        answer: "Sorry, we didn't find any information related to your question.",
                        response_text: "Sorry, we didn't find any information related to your question.",
                        source_documents: []
                    }
                };
            }

            // 5. Return Success
            console.log("[RAG Local] Gemini returned an answer.");
            return {
                success: true,
                data: {
                    answer: responseText,
                    response_text: responseText, // Key field used by ask.js logic
                    source_documents: docs.map(d => ({
                        file_name: d.file_name,
                        uri: d.document_id
                    })).slice(0, 5), // Return top 5 docs as reference
                    grounding_metadata: {
                        groundingChunks: docs.map(d => ({
                            retrievedContext: { text: d.file_name }
                        })).slice(0, 5)
                    }
                }
            };

        } catch (error) {
            console.error('Error asking question:', error);
            // Return valid failure format so ask.js handles it gracefully
            return {
                success: true,
                data: {
                    answer: "Sorry, we didn't find any information related to your question (Error).",
                    response_text: "Sorry, we didn't find any information related to your question.",
                    source_documents: []
                }
            };
        }
    }

    /**
     * Check if a store exists
     * @param {string} apiKey - Gemini API key
     * @param {string} storeName - Name of the store to check
     * @returns {Promise<boolean>} True if store exists
     */
    async storeExists(apiKey, storeName) {
        try {
            const result = await this.listStores(apiKey);
            if (result.success && result.data.stores) {
                return result.data.stores.some(store => store.store_name === storeName);
            }
            return false;
        } catch (error) {
            console.error('Error checking store existence:', error);
            return false;
        }
    }

    /**
     * Create a unique store name for a university
     * @param {string} universityName - Name of the university
     * @returns {string} Sanitized store name
     */
    generateStoreName(universityName) {
        // Remove special characters and convert to lowercase
        let storeName = universityName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .trim();

        // Add timestamp suffix to ensure uniqueness
        const timestamp = Date.now();
        storeName = `${storeName}_${timestamp}`;

        // Limit length
        if (storeName.length > 100) {
            storeName = storeName.substring(0, 100);
        }

        return storeName;
    }

    /**
     * Initialize store for a university during registration
     * @param {string} apiKey - Gemini API key
     * @param {string} universityName - Name of the university
     * @param {string} universityEmail - Email of the university (for uniqueness)
     * @returns {Promise<Object>} Store creation result
     */
    async initializeUniversityStore(apiKey, universityName, universityEmail) {
        try {
            // Use email as store name as per previous logic
            const storeName = universityEmail;

            // Check if store already exists
            const exists = await this.storeExists(apiKey, storeName);
            if (exists) {
                // If exists, just return success (we reuse the store)
                // Need to fetch details to be fully compliant
                const stores = await MongoDBHelper.queryDocs(this.STORES_COLLECTION, [
                    ['store_name', '==', storeName]
                ]);
                const store = stores[0];

                return {
                    success: true,
                    data: {
                        store_name: storeName,
                        file_search_store_resource: {
                            name: `stores/${store.id}`,
                            file_search_store_id: store.id
                        }
                    }
                };
            }

            // Create the store
            const result = await this.createStore(apiKey, storeName);
            return result;

        } catch (error) {
            console.error('Error initializing university store:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get store statistics
     * @param {string} apiKey - Gemini API key
     * @param {string} storeName - Name of the store
     * @returns {Promise<Object>} Store statistics
     */
    async getStoreStats(apiKey, storeName) {
        try {
            const result = await this.listStores(apiKey);
            if (result.success && result.data.stores) {
                const store = result.data.stores.find(s => s.store_name === storeName);
                if (store) {
                    // Populate file count if possible
                    const files = await MongoDBHelper.queryDocs(this.DOCUMENTS_COLLECTION, [
                        ['store_name', '==', storeName]
                    ]);

                    return {
                        success: true,
                        stats: {
                            storeName: store.store_name,
                            fileCount: files.length,
                            createdAt: store.created_at,
                            files: files.map(f => ({ name: f.file_name, uri: f.document_id }))
                        }
                    };
                }
            }
            return {
                success: false,
                error: 'Store not found'
            };
        } catch (error) {
            console.error('Error getting store stats:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export singleton instance
module.exports = new RAGService();