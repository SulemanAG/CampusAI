# SmartUniversity - SmartSolve & Social Media API Documentation

**Base URL:** `https://smartuniversity-916628151603.asia-south1.run.app`

**API Method:** All endpoints use **HTTP GET** with query parameters (no JSON body)

---

## 📋 SmartSolve APIs

SmartSolve automatically clusters similar support tickets and allows department agents to solve multiple tickets at once.

### 1. Get Smart Solve Tickets

**Endpoint:** `GET /api/smartsolve/getsmartsolveticket`

**Description:** Retrieves clustered tickets that are ready to be solved. SmartSolve automatically groups similar tickets when there are more than 4 pending tickets for a department.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| accountEmail | string | Yes | Department/agent email address |

**Example Request:**
```
GET https://smartuniversity-916628151603.asia-south1.run.app/api/smartsolve/getsmartsolveticket?accountEmail=cse@kletech.ac.in
```

**Success Response (200):**
```json
{
  "accountEmail": "cse@kletech.ac.in",
  "status": "active",
  "summary": {
    "totalOriginalTickets": 15,
    "totalClusters": 5,
    "reductionPercentage": 66.67,
    "ticketsToSolve": 5
  },
  "clusteredQuestions": [
    {
      "uniqueId": 1,
      "question": "How to reset the college Wi-Fi password?",
      "category": "Network",
      "affectedTickets": 8,
      "ticketIds": ["ticket_001", "ticket_005", "ticket_009", ...]
    },
    {
      "uniqueId": 2,
      "question": "When will semester exam results be published?",
      "category": "Academics",
      "affectedTickets": 4,
      "ticketIds": ["ticket_002", "ticket_008", ...]
    },
    {
      "uniqueId": 3,
      "question": "Library access issue during weekends",
      "category": "Facilities",
      "affectedTickets": 3,
      "ticketIds": ["ticket_003", "ticket_012", "ticket_015"]
    }
  ],
  "createdAt": "2025-12-28T10:30:00.000Z",
  "updatedAt": "2025-12-28T10:30:00.000Z"
}
```

**Error Response (404):**
```json
{
  "error": "No smart solve questions available",
  "message": "Either not enough tickets or clustering hasn't been processed yet"
}
```

**Error Response (404):**
```json
{
  "error": "Account not found"
}
```

---

### 2. Solve Smart Tickets

**Endpoint:** `GET /api/smartsolve/solveSmartTickets`

**Description:** Submit solutions for clustered tickets. Each solution will be applied to all tickets in that cluster.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| accountEmail | string | Yes | Department/agent email address |
| solutions | JSON string | Yes | Array of solutions for each cluster |

**Solutions Format:**
The `solutions` parameter must be a **JSON string** (not a direct object):
```json
[
  {
    "uniqueId": 1,
    "solution": "Your detailed solution here"
  },
  {
    "uniqueId": 2,
    "solution": "Another solution for cluster 2"
  }
]
```

**Example Request:**
```
GET https://smartuniversity-916628151603.asia-south1.run.app/api/smartsolve/solveSmartTickets?accountEmail=cse@kletech.ac.in&solutions=[{"uniqueId":1,"solution":"To reset your Wi-Fi password, visit the IT desk with your student ID."},{"uniqueId":2,"solution":"Results will be published on January 15th on the college portal."}]
```

**Success Response (200):**
```json
{
  "message": "Smart solve processing completed",
  "results": {
    "accountEmail": "cse@kletech.ac.in",
    "totalSolutionsProvided": 2,
    "totalTicketsUpdated": 12,
    "solvedClusters": [
      {
        "uniqueId": 1,
        "question": "How to reset the college Wi-Fi password?",
        "category": "Network",
        "totalTickets": 8,
        "successfullyUpdated": 8,
        "failed": 0,
        "updatedTickets": ["ticket_001", "ticket_005", ...],
        "failedTickets": []
      },
      {
        "uniqueId": 2,
        "question": "When will semester exam results be published?",
        "category": "Academics",
        "totalTickets": 4,
        "successfullyUpdated": 4,
        "failed": 0,
        "updatedTickets": ["ticket_002", "ticket_008", ...],
        "failedTickets": []
      }
    ],
    "errors": []
  }
}
```

**Error Response (400):**
```json
{
  "error": "solutions must be a valid JSON string",
  "example": "[{\"uniqueId\":1,\"solution\":\"Your solution here\"}]"
}
```

**Error Response (400):**
```json
{
  "error": "Invalid uniqueId(s) provided",
  "invalidIds": [99],
  "validIds": [1, 2, 3, 4, 5]
}
```

**Notes:**
- After successful solving, the clustered questions are automatically cleared
- All tickets in a cluster receive the same solution
- Both the main ticket database and student records are updated

---

### 3. Clear Smart Solve Questions

**Endpoint:** `GET /api/smartsolve/clearSmartSolve`

**Description:** Manually clear/reset the smart solve clustered questions for an account.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| accountEmail | string | Yes | Department/agent email address |

**Example Request:**
```
GET https://smartuniversity-916628151603.asia-south1.run.app/api/smartsolve/clearSmartSolve?accountEmail=cse@kletech.ac.in
```

**Success Response (200):**
```json
{
  "message": "Smart solve questions cleared successfully",
  "accountEmail": "cse@kletech.ac.in"
}
```

**Error Response (404):**
```json
{
  "error": "No smart solve questions to clear"
}
```

---

## 📱 Social Media APIs

### 1. Create Post

**Endpoint:** `GET /api/socialmedia/post/create`

**Description:** Create a new social media post (text and/or images).

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | Yes | User email (student or account) |
| password | string | Yes | User password |
| text | string | No* | Post text content |
| images | JSON string | No* | Array of image objects |

*At least one of `text` or `images` must be provided

**Images Format:**
```json
[
  {
    "data": "base64-encoded-image-data",
    "mimeType": "image/jpeg"
  }
]
```

**Example Request:**
```
GET https://smartuniversity-916628151603.asia-south1.run.app/api/socialmedia/post/create?email=student@kletech.ac.in&password=mypass123&text=Hello%20world!&images=[{"data":"iVBORw0KG...","mimeType":"image/jpeg"}]
```

**Success Response (201):**
```json
{
  "message": "Post created successfully",
  "post": {
    "postId": "post_1766914012345_abc123",
    "authorEmail": "student@kletech.ac.in",
    "authorType": "student",
    "authorName": "John Doe",
    "universityEmail": "kletech.ac.in",
    "text": "Hello world!",
    "images": [...],
    "likes": [],
    "upvotes": [],
    "comments": [],
    "targetedDepartments": ["cse@kletech.ac.in", "admission@kletech.ac.in"],
    "postSummary": "General greeting message",
    "createdAt": "2025-12-28T10:30:00.000Z",
    "updatedAt": "2025-12-28T10:30:00.000Z"
  }
}
```

**Notes:**
- Student posts are automatically classified and targeted to relevant departments
- Account posts don't have department targeting
- Images are stored as base64 in the database

---

### 2. Get Posts by Email

**Endpoint:** `GET /api/socialmedia/posts/:email`

**Description:** Retrieve all posts created by a specific user.

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| email | string | User email address |

**Example Request:**
```
GET https://smartuniversity-916628151603.asia-south1.run.app/api/socialmedia/posts/student@kletech.ac.in
```

**Success Response (200):**
```json
{
  "email": "student@kletech.ac.in",
  "totalPosts": 5,
  "posts": [
    {
      "postId": "post_1766914012345_abc123",
      "authorEmail": "student@kletech.ac.in",
      "text": "Latest post",
      "createdAt": "2025-12-28T12:00:00.000Z",
      ...
    },
    {
      "postId": "post_1766913012345_xyz789",
      "authorEmail": "student@kletech.ac.in",
      "text": "Older post",
      "createdAt": "2025-12-27T10:00:00.000Z",
      ...
    }
  ]
}
```

---

### 3. Get Home Feed (All Posts)

**Endpoint:** `GET /api/socialmedia/posts/feed/all`

**Description:** Get all posts sorted by engagement algorithm (recency + likes + upvotes + comments).

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| limit | number | No | 50 | Maximum posts to return |

**Example Request:**
```
GET https://smartuniversity-916628151603.asia-south1.run.app/api/socialmedia/posts/feed/all?limit=20
```

**Success Response (200):**
```json
{
  "totalPosts": 150,
  "displayedPosts": 20,
  "posts": [
    {
      "postId": "post_xxx",
      "authorEmail": "student1@kletech.ac.in",
      "text": "Trending post with high engagement",
      "_engagementScore": 245.5,
      "likes": ["user1@...", "user2@..."],
      "upvotes": ["user3@...", "user4@..."],
      "comments": [...],
      ...
    }
  ]
}
```

**Engagement Algorithm:**
- Recency Score: `max(0, 100 - ageInHours)`
- Engagement Score: `(upvotes × 3) + (likes × 2) + (comments × 1.5)`
- Total Score: `Recency + Engagement`

---

### 4. Get Department-Specific Posts

**Endpoint:** `GET /api/socialmedia/posts/department/:accountEmail`

**Description:** Get posts targeted to a specific department (for department agents).

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| accountEmail | string | Department email address |

**Example Request:**
```
GET https://smartuniversity-916628151603.asia-south1.run.app/api/socialmedia/posts/department/cse@kletech.ac.in
```

**Success Response (200):**
```json
{
  "accountEmail": "cse@kletech.ac.in",
  "totalPosts": 12,
  "posts": [
    {
      "postId": "post_xxx",
      "authorEmail": "student@kletech.ac.in",
      "authorType": "student",
      "text": "Issue related to CSE department",
      "targetedDepartments": ["cse@kletech.ac.in"],
      "postSummary": "Student reporting lab access issue",
      ...
    }
  ]
}
```

**Notes:**
- Only shows student posts from the same university
- Only posts where this department is in `targetedDepartments`
- Sorted by newest first

---

### 5. Delete Post

**Endpoint:** `GET /api/socialmedia/post/delete`

**Description:** Delete a post (only by the post author).

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | Yes | User email |
| postId | string | Yes | ID of the post to delete |
| password | string | Yes | User password |

**Example Request:**
```
GET https://smartuniversity-916628151603.asia-south1.run.app/api/socialmedia/post/delete?email=student@kletech.ac.in&postId=post_xxx&password=mypass123
```

**Success Response (200):**
```json
{
  "message": "Post deleted successfully",
  "postId": "post_xxx"
}
```

**Error Response (403):**
```json
{
  "error": "You can only delete your own posts"
}
```

---

### 6. Like/Unlike Post

**Endpoint:** `GET /api/socialmedia/post/like`

**Description:** Toggle like on a post.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | Yes | User email |
| postId | string | Yes | Post ID |

**Example Request:**
```
GET https://smartuniversity-916628151603.asia-south1.run.app/api/socialmedia/post/like?email=user@kletech.ac.in&postId=post_xxx
```

**Success Response (200):**
```json
{
  "message": "Post liked successfully",
  "postId": "post_xxx",
  "action": "liked",
  "totalLikes": 15
}
```

**Or if already liked:**
```json
{
  "message": "Post unliked successfully",
  "postId": "post_xxx",
  "action": "unliked",
  "totalLikes": 14
}
```

---

### 7. Upvote/Unupvote Post

**Endpoint:** `GET /api/socialmedia/post/upvote`

**Description:** Toggle upvote on a post.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | Yes | User email |
| postId | string | Yes | Post ID |

**Example Request:**
```
GET https://smartuniversity-916628151603.asia-south1.run.app/api/socialmedia/post/upvote?email=user@kletech.ac.in&postId=post_xxx
```

**Success Response (200):**
```json
{
  "message": "Post upvoted successfully",
  "postId": "post_xxx",
  "action": "upvoted",
  "totalUpvotes": 8
}
```

---

### 8. Add Comment

**Endpoint:** `GET /api/socialmedia/post/comment/add`

**Description:** Add a comment to a post.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | Yes | User email |
| postId | string | Yes | Post ID |
| comment | string | Yes | Comment text |

**Example Request:**
```
GET https://smartuniversity-916628151603.asia-south1.run.app/api/socialmedia/post/comment/add?email=user@kletech.ac.in&postId=post_xxx&comment=Great%20post!
```

**Success Response (201):**
```json
{
  "message": "Comment added successfully",
  "comment": {
    "commentId": "comment_1766914012345_abc123",
    "authorEmail": "user@kletech.ac.in",
    "authorName": "John Doe",
    "authorType": "student",
    "comment": "Great post!",
    "createdAt": "2025-12-28T10:30:00.000Z"
  },
  "totalComments": 5
}
```

---

### 9. Delete Comment

**Endpoint:** `GET /api/socialmedia/post/comment/delete`

**Description:** Delete a comment (only by comment author).

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | Yes | User email |
| postId | string | Yes | Post ID |
| commentId | string | Yes | Comment ID |

**Example Request:**
```
GET https://smartuniversity-916628151603.asia-south1.run.app/api/socialmedia/post/comment/delete?email=user@kletech.ac.in&postId=post_xxx&commentId=comment_yyy
```

**Success Response (200):**
```json
{
  "message": "Comment deleted successfully",
  "commentId": "comment_yyy",
  "totalComments": 4
}
```

**Error Response (403):**
```json
{
  "error": "You can only delete your own comments"
}
```

---

## 🔑 Common Error Responses

**400 Bad Request:**
```json
{
  "error": "Missing required parameters"
}
```

**401 Unauthorized:**
```json
{
  "error": "Invalid password"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

---

## 📝 Important Notes

1. **All APIs use GET method with query parameters** (no POST body)
2. **URL Encoding:** Ensure all query parameters are URL-encoded
3. **JSON Parameters:** When passing JSON (like `solutions` or `images`), send as stringified JSON
4. **Authentication:** Most endpoints require email/password verification
5. **Base64 Images:** Images must be base64-encoded strings
6. **Auto-Clustering:** SmartSolve runs automatically when 5+ tickets are pending
7. **Department Targeting:** Student posts are auto-classified using AI
8. **Engagement Algorithm:** Posts ranked by recency and interaction
