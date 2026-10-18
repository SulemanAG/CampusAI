const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db, Collections, MongoDBHelper } = require('./mongodb');
const { classifyIssue } = require('./duplicate_classprediction');

// ------------------------------
// Helper Functions
// ------------------------------
const readStudent = async (email) => {
    try {
        const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
        return await MongoDBHelper.getDoc(Collections.STUDENTS, sanitizedEmail);
    } catch {
        return null;
    }
};

const readAccount = async (email) => {
    try {
        const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
        return await MongoDBHelper.getDoc(Collections.ACCOUNTS, sanitizedEmail);
    } catch {
        return null;
    }
};

const readUniversity = async (email) => {
    try {
        const sanitizedEmail = MongoDBHelper.sanitizeEmail(email);
        return await MongoDBHelper.getDoc(Collections.UNIVERSITIES, sanitizedEmail);
    } catch {
        return null;
    }
};

// Generate unique post ID
const generatePostId = () => {
    return `post_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
};

// Generate unique comment ID
const generateCommentId = () => {
    return `comment_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
};

// ------------------------------
// API 1: Create Post (GET)
// ------------------------------
router.get('/post/create', async (req, res) => {
    try {
        const { email, text, images, password } = req.query;

        // Parse images if it's a JSON string
        let parsedImages = [];
        if (images) {
            try {
                parsedImages = typeof images === 'string' ? JSON.parse(images) : images;
            } catch (parseErr) {
                return res.status(400).json({ 
                    error: "images must be a valid JSON array string",
                    example: '[{"data":"base64-string","mimeType":"image/jpeg"}]'
                });
            }
        }

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: "email and password are required" });
        }

        if ((!text || text.trim().length === 0) && (!parsedImages || parsedImages.length === 0)) {
            return res.status(400).json({ error: "Either text or images must be provided" });
        }

        // Check if student or account
        let user = await readStudent(email);
        let userType = 'student';
        
        if (!user) {
            user = await readAccount(email);
            userType = 'account';
        }

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Verify password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: "Invalid password" });
        }

        const postId = generatePostId();
        const createdAt = new Date().toISOString();

        // Base post object
        const post = {
            postId,
            authorEmail: email,
            authorType: userType,
            authorName: user.name || user.accountName || 'Anonymous',
            universityEmail: user.universityEmail,
            text: text || '',
            images: parsedImages || [],
            likes: [],
            upvotes: [],
            comments: [],
            createdAt,
            updatedAt: createdAt
        };

        // If student post, classify and add targeted departments
        if (userType === 'student') {
            try {
                // Get all accounts of the same university
                const allAccounts = await MongoDBHelper.queryDocs(Collections.ACCOUNTS, [
                    ['universityEmail', '==', user.universityEmail]
                ]);

                const accountEmails = allAccounts.map(acc => acc.accountEmail || acc.id);
                const accountNames = allAccounts.map(acc => acc.accountName || acc.accountEmail);

                // Prepare images for classification
                let imageObjects = [];
                if (parsedImages && parsedImages.length > 0) {
                    imageObjects = parsedImages.map(img => ({
                        buffer: Buffer.from(img.data, 'base64'),
                        mimeType: img.mimeType || 'image/jpeg'
                    }));
                }

                // Classify the post
                const classification = await classifyIssue(
                    text || 'Image post',
                    accountNames,
                    imageObjects,
                    createdAt
                );

                // Map department name back to account emails
                let targetedDepartments = [];
                if (classification.department) {
                    const departmentIndex = accountNames.indexOf(classification.department);
                    if (departmentIndex !== -1) {
                        targetedDepartments = [accountEmails[departmentIndex]];
                    } else {
                        // If exact match not found, send to all accounts
                        targetedDepartments = accountEmails;
                    }
                } else {
                    // No classification - send to all departments
                    targetedDepartments = accountEmails;
                }

                post.targetedDepartments = targetedDepartments;
                post.postSummary = classification.summary || 'No summary available';
                post.classificationTimestamp = classification.timestamp;

                console.log(`📊 Post classified: Department=${classification.department}, Summary=${classification.summary}`);

            } catch (classifyErr) {
                console.error('Classification error:', classifyErr);
                // Fallback - send to all departments
                const allAccounts = await MongoDBHelper.queryDocs(Collections.ACCOUNTS, [
                    ['universityEmail', '==', user.universityEmail]
                ]);
                post.targetedDepartments = allAccounts.map(acc => acc.accountEmail || acc.id);
                post.postSummary = 'Classification unavailable';
            }
        }

        // Save post to Firestore
        await MongoDBHelper.setDoc(Collections.SOCIAL_POSTS, postId, post);

        res.status(201).json({
            message: "Post created successfully",
            post
        });

    } catch (err) {
        console.error("Create post error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------------------
// API 2: Get All Posts by Email (GET)
// ------------------------------
router.get('/posts/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const posts = await MongoDBHelper.queryDocs(Collections.SOCIAL_POSTS, [
            ['authorEmail', '==', email]
        ]);

        // Sort by newest first
        posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            email,
            totalPosts: posts.length,
            posts
        });

    } catch (err) {
        console.error("Get posts error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------------------
// API 3: Get All Posts (Home Feed with Algorithm) (GET)
// ------------------------------
router.get('/posts/feed/all', async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        // Get all posts
        const allPosts = await MongoDBHelper.getAllDocs(Collections.SOCIAL_POSTS);

        // Calculate engagement score for each post
        const postsWithScore = allPosts.map(post => {
            const ageInHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
            const likesCount = (post.likes || []).length;
            const upvotesCount = (post.upvotes || []).length;
            const commentsCount = (post.comments || []).length;

            // Algorithm: Recent posts get boost, engagement adds score, decay over time
            const recencyScore = Math.max(0, 100 - ageInHours);
            const engagementScore = (upvotesCount * 3) + (likesCount * 2) + (commentsCount * 1.5);
            const totalScore = recencyScore + engagementScore;

            return {
                ...post,
                _engagementScore: totalScore
            };
        });

        // Sort by engagement score (highest first)
        postsWithScore.sort((a, b) => b._engagementScore - a._engagementScore);

        // Limit results
        const limitedPosts = postsWithScore.slice(0, parseInt(limit));

        res.json({
            totalPosts: allPosts.length,
            displayedPosts: limitedPosts.length,
            posts: limitedPosts
        });

    } catch (err) {
        console.error("Get feed error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------------------
// API 4: Get Department-Specific Posts for Account (GET)
// ------------------------------
router.get('/posts/department/:accountEmail', async (req, res) => {
    try {
        const { accountEmail } = req.params;

        const account = await readAccount(accountEmail);
        if (!account) {
            return res.status(404).json({ error: "Account not found" });
        }

        // Get all posts
        const allPosts = await MongoDBHelper.getAllDocs(Collections.SOCIAL_POSTS);

        // Filter posts that:
        // 1. Are from students of the same university
        // 2. Have this account email in targetedDepartments
        const relevantPosts = allPosts.filter(post => {
            return post.authorType === 'student' &&
                   post.universityEmail === account.universityEmail &&
                   post.targetedDepartments &&
                   post.targetedDepartments.includes(accountEmail);
        });

        // Sort by newest first
        relevantPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            accountEmail,
            totalPosts: relevantPosts.length,
            posts: relevantPosts
        });

    } catch (err) {
        console.error("Get department posts error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------------------
// API 5: Delete Post (GET)
// ------------------------------
router.get('/post/delete', async (req, res) => {
    try {
        const { email, postId, password } = req.query;

        if (!email || !postId || !password) {
            return res.status(400).json({ error: "email, postId, and password are required" });
        }

        const post = await MongoDBHelper.getDoc(Collections.SOCIAL_POSTS, postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        // Verify ownership
        if (post.authorEmail !== email) {
            return res.status(403).json({ error: "You can only delete your own posts" });
        }

        // Verify password
        let user = await readStudent(email);
        if (!user) user = await readAccount(email);
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: "Invalid password" });
        }

        // Delete post
        await MongoDBHelper.deleteDoc(Collections.SOCIAL_POSTS, postId);

        res.json({
            message: "Post deleted successfully",
            postId
        });

    } catch (err) {
        console.error("Delete post error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------------------
// API 6: Like/Unlike Post (GET)
// ------------------------------
router.get('/post/like', async (req, res) => {
    try {
        const { email, postId } = req.query;

        if (!email || !postId) {
            return res.status(400).json({ error: "email and postId are required" });
        }

        const post = await MongoDBHelper.getDoc(Collections.SOCIAL_POSTS, postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        post.likes = post.likes || [];

        const likeIndex = post.likes.indexOf(email);
        let action = '';

        if (likeIndex === -1) {
            // Add like
            post.likes.push(email);
            action = 'liked';
        } else {
            // Remove like
            post.likes.splice(likeIndex, 1);
            action = 'unliked';
        }

        post.updatedAt = new Date().toISOString();
        await MongoDBHelper.setDoc(Collections.SOCIAL_POSTS, postId, post);

        res.json({
            message: `Post ${action} successfully`,
            postId,
            action,
            totalLikes: post.likes.length
        });

    } catch (err) {
        console.error("Like post error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------------------
// API 7: Upvote/Unupvote Post (GET)
// ------------------------------
router.get('/post/upvote', async (req, res) => {
    try {
        const { email, postId } = req.query;

        if (!email || !postId) {
            return res.status(400).json({ error: "email and postId are required" });
        }

        const post = await MongoDBHelper.getDoc(Collections.SOCIAL_POSTS, postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        post.upvotes = post.upvotes || [];

        const upvoteIndex = post.upvotes.indexOf(email);
        let action = '';

        if (upvoteIndex === -1) {
            // Add upvote
            post.upvotes.push(email);
            action = 'upvoted';
        } else {
            // Remove upvote
            post.upvotes.splice(upvoteIndex, 1);
            action = 'unupvoted';
        }

        post.updatedAt = new Date().toISOString();
        await MongoDBHelper.setDoc(Collections.SOCIAL_POSTS, postId, post);

        res.json({
            message: `Post ${action} successfully`,
            postId,
            action,
            totalUpvotes: post.upvotes.length
        });

    } catch (err) {
        console.error("Upvote post error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------------------
// API 8: Add Comment (GET)
// ------------------------------
router.get('/post/comment/add', async (req, res) => {
    try {
        const { email, postId, comment } = req.query;

        if (!email || !postId || !comment || comment.trim().length === 0) {
            return res.status(400).json({ error: "email, postId, and comment are required" });
        }

        const post = await MongoDBHelper.getDoc(Collections.SOCIAL_POSTS, postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        // Get commenter details
        let user = await readStudent(email);
        let userType = 'student';
        
        if (!user) {
            user = await readAccount(email);
            userType = 'account';
        }

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const commentId = generateCommentId();
        const commentObj = {
            commentId,
            authorEmail: email,
            authorName: user.name || user.accountName || 'Anonymous',
            authorType: userType,
            comment: comment.trim(),
            createdAt: new Date().toISOString()
        };

        post.comments = post.comments || [];
        post.comments.push(commentObj);
        post.updatedAt = new Date().toISOString();

        await MongoDBHelper.setDoc(Collections.SOCIAL_POSTS, postId, post);

        res.status(201).json({
            message: "Comment added successfully",
            comment: commentObj,
            totalComments: post.comments.length
        });

    } catch (err) {
        console.error("Add comment error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------------------
// API 9: Delete Comment (GET)
// ------------------------------
router.get('/post/comment/delete', async (req, res) => {
    try {
        const { email, postId, commentId } = req.query;

        if (!email || !postId || !commentId) {
            return res.status(400).json({ error: "email, postId, and commentId are required" });
        }

        const post = await MongoDBHelper.getDoc(Collections.SOCIAL_POSTS, postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        post.comments = post.comments || [];

        const commentIndex = post.comments.findIndex(c => c.commentId === commentId);
        if (commentIndex === -1) {
            return res.status(404).json({ error: "Comment not found" });
        }

        // Verify ownership
        if (post.comments[commentIndex].authorEmail !== email) {
            return res.status(403).json({ error: "You can only delete your own comments" });
        }

        // Remove comment
        post.comments.splice(commentIndex, 1);
        post.updatedAt = new Date().toISOString();

        await MongoDBHelper.setDoc(Collections.SOCIAL_POSTS, postId, post);

        res.json({
            message: "Comment deleted successfully",
            commentId,
            totalComments: post.comments.length
        });

    } catch (err) {
        console.error("Delete comment error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
