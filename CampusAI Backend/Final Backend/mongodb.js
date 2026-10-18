const { MongoClient } = require('mongodb');

// MongoDB URI and client
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://iitguwahati471_db_user:IIIeqOaVyrnFMkTO@cluster0.hsrf90z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'smartuniversity';

let client;
let db;

// Initialize MongoDB connection
const initializeMongoDB = async () => {
    try {
        if (db) {
            console.log('✅ MongoDB already connected');
            return db;
        }

        client = new MongoClient(MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        await client.connect();
        db = client.db(DB_NAME);

        console.log('✅ MongoDB connected successfully');

        // Create indexes for better performance
        await createIndexes();

        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        throw error;
    }
};

// Create indexes for commonly queried fields
const createIndexes = async () => {
    try {
        // Accounts collection
        await db.collection('accounts').createIndex({ universityEmail: 1 });
        await db.collection('accounts').createIndex({ accountEmail: 1 }, { unique: true });

        // Students collection
        await db.collection('students').createIndex({ email: 1 }, { unique: true });
        await db.collection('students').createIndex({ universityEmail: 1 });

        // Tickets collection
        await db.collection('tickets').createIndex({ accountEmail: 1 });
        await db.collection('tickets').createIndex({ status: 1 });
        await db.collection('tickets').createIndex({ createdAt: -1 });

        // Social posts collection
        await db.collection('social_posts').createIndex({ authorEmail: 1 });
        await db.collection('social_posts').createIndex({ createdAt: -1 });
        await db.collection('social_posts').createIndex({ 'metadata.department': 1 });

        // Chat sessions collection
        await db.collection('chat_sessions').createIndex({ studentEmail: 1 });
        await db.collection('chat_sessions').createIndex({ createdAt: -1 });

        console.log('✅ MongoDB indexes created');
    } catch (error) {
        console.error('⚠️  Error creating indexes:', error.message);
    }
};

// Collections constant
const Collections = {
    UNIVERSITIES: 'universities',
    ACCOUNTS: 'accounts',
    STUDENTS: 'students',
    TICKETS: 'tickets',
    UPLOADS: 'uploads',
    CHAT_SESSIONS: 'chat_sessions',
    PROVIDER_QUESTIONS: 'provider_questions',
    PENDING_REGISTRATIONS: 'pending_registrations',
    PENDING_STUDENT_REGISTRATIONS: 'pending_student_registrations',
    SOCIAL_POSTS: 'social_posts',
    RAG_STORES: 'rag_stores',
    RAG_DOCUMENTS: 'rag_documents'
};

// Helper functions for MongoDB operations
const MongoDBHelper = {
    /**
     * Get a document by ID (email as _id)
     */
    async getDoc(collection, docId) {
        try {
            if (!db) await initializeMongoDB();
            const sanitizedId = this.sanitizeEmail(docId);
            const doc = await db.collection(collection).findOne({ _id: sanitizedId });
            if (!doc) return null;
            return { id: doc._id, ...doc };
        } catch (error) {
            console.error(`Error getting document from ${collection}:`, error);
            throw error;
        }
    },

    /**
     * Create or update a document
     */
    async setDoc(collection, docId, data, merge = true) {
        try {
            if (!db) await initializeMongoDB();
            const sanitizedId = this.sanitizeEmail(docId);

            const docData = { ...data, _id: sanitizedId };

            if (merge) {
                await db.collection(collection).updateOne(
                    { _id: sanitizedId },
                    { $set: docData },
                    { upsert: true }
                );
            } else {
                await db.collection(collection).replaceOne(
                    { _id: sanitizedId },
                    docData,
                    { upsert: true }
                );
            }

            return { id: sanitizedId, ...data };
        } catch (error) {
            console.error(`Error setting document in ${collection}:`, error);
            throw error;
        }
    },

    /**
     * Delete a document
     */
    async deleteDoc(collection, docId) {
        try {
            if (!db) await initializeMongoDB();
            const sanitizedId = this.sanitizeEmail(docId);
            await db.collection(collection).deleteOne({ _id: sanitizedId });
            return true;
        } catch (error) {
            console.error(`Error deleting document from ${collection}:`, error);
            throw error;
        }
    },

    /**
     * Query documents with filters
     */
    async queryDocs(collection, filters = []) {
        try {
            if (!db) await initializeMongoDB();

            let query = {};

            // Convert Firestore-style filters to MongoDB query
            filters.forEach(([field, operator, value]) => {
                switch (operator) {
                    case '==':
                        query[field] = value;
                        break;
                    case '!=':
                        query[field] = { $ne: value };
                        break;
                    case '>':
                        query[field] = { $gt: value };
                        break;
                    case '>=':
                        query[field] = { $gte: value };
                        break;
                    case '<':
                        query[field] = { $lt: value };
                        break;
                    case '<=':
                        query[field] = { $lte: value };
                        break;
                    case 'array-contains':
                        query[field] = { $elemMatch: { $eq: value } };
                        break;
                    case 'in':
                        query[field] = { $in: value };
                        break;
                    default:
                        query[field] = value;
                }
            });

            const docs = await db.collection(collection).find(query).toArray();
            return docs.map(doc => ({ id: doc._id, ...doc }));
        } catch (error) {
            console.error(`Error querying ${collection}:`, error);
            throw error;
        }
    },

    /**
     * Get all documents in a collection
     */
    async getAllDocs(collection) {
        try {
            if (!db) await initializeMongoDB();
            const docs = await db.collection(collection).find({}).toArray();
            return docs.map(doc => ({ id: doc._id, ...doc }));
        } catch (error) {
            console.error(`Error getting all documents from ${collection}:`, error);
            throw error;
        }
    },

    /**
     * Update specific fields in a document
     */
    async updateDoc(collection, docId, data) {
        try {
            if (!db) await initializeMongoDB();
            const sanitizedId = this.sanitizeEmail(docId);
            await db.collection(collection).updateOne(
                { _id: sanitizedId },
                { $set: data }
            );
            return { id: sanitizedId, ...data };
        } catch (error) {
            console.error(`Error updating document in ${collection}:`, error);
            throw error;
        }
    },

    /**
     * Batch write operations
     */
    async batchWrite(operations) {
        try {
            if (!db) await initializeMongoDB();
            const bulkOps = [];

            operations.forEach(({ type, collection: coll, docId, data }) => {
                const sanitizedId = this.sanitizeEmail(docId);

                switch (type) {
                    case 'set':
                        bulkOps.push({
                            collection: coll,
                            operation: {
                                updateOne: {
                                    filter: { _id: sanitizedId },
                                    update: { $set: { ...data, _id: sanitizedId } },
                                    upsert: true
                                }
                            }
                        });
                        break;
                    case 'update':
                        bulkOps.push({
                            collection: coll,
                            operation: {
                                updateOne: {
                                    filter: { _id: sanitizedId },
                                    update: { $set: data }
                                }
                            }
                        });
                        break;
                    case 'delete':
                        bulkOps.push({
                            collection: coll,
                            operation: {
                                deleteOne: {
                                    filter: { _id: sanitizedId }
                                }
                            }
                        });
                        break;
                }
            });

            // Group operations by collection
            const collectionOps = {};
            bulkOps.forEach(({ collection, operation }) => {
                if (!collectionOps[collection]) {
                    collectionOps[collection] = [];
                }
                collectionOps[collection].push(operation);
            });

            // Execute bulk operations per collection
            for (const [collection, ops] of Object.entries(collectionOps)) {
                await db.collection(collection).bulkWrite(ops);
            }

            return true;
        } catch (error) {
            console.error('Error in batch write:', error);
            throw error;
        }
    },

    /**
     * Check if document exists
     */
    async docExists(collection, docId) {
        try {
            if (!db) await initializeMongoDB();
            const sanitizedId = this.sanitizeEmail(docId);
            const doc = await db.collection(collection).findOne({ _id: sanitizedId });
            return !!doc;
        } catch (error) {
            console.error(`Error checking document existence in ${collection}:`, error);
            return false;
        }
    },

    /**
     * Sanitize email for use as document ID
     */
    sanitizeEmail(email) {
        return email.replace(/[^a-zA-Z0-9@._-]/g, '_');
    },

    /**
     * Get database instance
     */
    getDB() {
        return db;
    }
};

// Initialize on module load
initializeMongoDB().catch(err => {
    console.error('Failed to initialize MongoDB:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    if (client) {
        await client.close();
        console.log('MongoDB connection closed');
        process.exit(0);
    }
});

module.exports = {
    db: () => db,
    Collections,
    MongoDBHelper,
    initializeMongoDB
};
