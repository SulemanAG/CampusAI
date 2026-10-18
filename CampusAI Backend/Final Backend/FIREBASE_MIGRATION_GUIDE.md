# Firebase Firestore Migration Guide

## ✅ Migration Complete!

Your SmartUniversity application has been successfully migrated from local JSON files to Firebase Firestore.

---

## 📋 What Was Migrated

### Files Updated:
1. **firebase.js** (NEW) - Firebase configuration and helper functions
2. **accounts.js** - Account and ticket management
3. **student.js** - Student registration and management
4. **university_admin.js** - University admin operations
5. **ask.js** - Chat sessions and provider logs

### Firestore Collections:
- `universities` - University admin accounts
- `accounts` - Department/sub-accounts
- `students` - Student records
- `tickets` - Support tickets
- `uploads` - File upload metadata
- `chat_sessions` - Student chat history
- `provider_questions` - Query logs per provider
- `pending_registrations` - Temporary registration data
- `pending_student_registrations` - Student registration data

---

## 🚀 Setup Instructions

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or select existing project
3. Follow the setup wizard
4. Enable Firestore Database:
   - Click "Firestore Database" in left sidebar
   - Click "Create Database"
   - Start in **production mode** or test mode
   - Choose a location (e.g., us-central1)

### Step 2: Get Firebase Credentials

**Option A: Service Account File (Recommended for Development)**

1. In Firebase Console, go to Project Settings (gear icon)
2. Navigate to "Service Accounts" tab
3. Click "Generate New Private Key"
4. Save the downloaded JSON file as `firebase-service-account.json` in your project root
5. ⚠️ **NEVER commit this file to git** (already added to .gitignore)

**Option B: Environment Variables (Recommended for Production)**

1. Get the credentials from the service account JSON file
2. Add them to your `.env` file:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

### Step 3: Update Environment Variables

Edit your `.env` file and add Firebase credentials (see above).

### Step 4: Start Your Server

```bash
npm start
```

The Firebase module will automatically initialize on startup.

---

## 🔄 Data Migration (Optional)

If you have existing data in JSON files, you need to migrate it to Firestore.

### Create a Migration Script

Create a file `migrate-data.js`:

```javascript
const fs = require('fs').promises;
const path = require('path');
const { FirestoreHelper, Collections } = require('./firebase');

async function migrateJSONToFirestore() {
    console.log('Starting migration...\n');
    
    // Migrate Universities
    try {
        const universitiesDir = path.join(__dirname, 'database/universities');
        const files = await fs.readdir(universitiesDir);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = JSON.parse(
                    await fs.readFile(path.join(universitiesDir, file), 'utf8')
                );
                const email = data.email;
                const sanitizedEmail = FirestoreHelper.sanitizeEmail(email);
                
                await FirestoreHelper.setDoc(Collections.UNIVERSITIES, sanitizedEmail, data);
                console.log(`✅ Migrated university: ${email}`);
            }
        }
    } catch (error) {
        console.error('Error migrating universities:', error.message);
    }
    
    // Migrate Accounts
    try {
        const accountsDir = path.join(__dirname, 'database/accounts');
        const files = await fs.readdir(accountsDir);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = JSON.parse(
                    await fs.readFile(path.join(accountsDir, file), 'utf8')
                );
                const email = data.accountEmail;
                const sanitizedEmail = FirestoreHelper.sanitizeEmail(email);
                
                await FirestoreHelper.setDoc(Collections.ACCOUNTS, sanitizedEmail, data);
                console.log(`✅ Migrated account: ${email}`);
            }
        }
    } catch (error) {
        console.error('Error migrating accounts:', error.message);
    }
    
    // Migrate Students
    try {
        const studentsDir = path.join(__dirname, 'database/students');
        const files = await fs.readdir(studentsDir);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = JSON.parse(
                    await fs.readFile(path.join(studentsDir, file), 'utf8')
                );
                const email = data.email;
                const sanitizedEmail = FirestoreHelper.sanitizeEmail(email);
                
                await FirestoreHelper.setDoc(Collections.STUDENTS, sanitizedEmail, data);
                console.log(`✅ Migrated student: ${email}`);
            }
        }
    } catch (error) {
        console.error('Error migrating students:', error.message);
    }
    
    // Migrate Chat Sessions
    try {
        const chatDir = path.join(__dirname, 'database/chat_sessions');
        const files = await fs.readdir(chatDir);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = JSON.parse(
                    await fs.readFile(path.join(chatDir, file), 'utf8')
                );
                const docId = file.replace('.json', '');
                
                await FirestoreHelper.setDoc(Collections.CHAT_SESSIONS, docId, data);
                console.log(`✅ Migrated chat session: ${docId}`);
            }
        }
    } catch (error) {
        console.error('Error migrating chat sessions:', error.message);
    }
    
    console.log('\n✅ Migration complete!');
}

// Run migration
migrateJSONToFirestore().catch(console.error);
```

Run the migration:
```bash
node migrate-data.js
```

---

## 🔍 Testing the Migration

### 1. Test University Registration
```bash
curl "http://localhost:3000/university/register/initiate?email=test@university.com&password=Test123456"
```

### 2. Test Student Registration
```bash
curl "http://localhost:3000/api/student/register/initiate?email=student@university.com&password=Test123456"
```

### 3. Check Firestore Console
- Go to Firebase Console
- Open Firestore Database
- Verify collections are created
- Check that data is being saved

---

## 📊 Firestore Data Structure

### Universities Collection
```
universities/{sanitized_email}
  ├── universityId
  ├── email
  ├── universityName
  ├── apiKeyInfo
  ├── ragStore
  └── ...
```

### Accounts Collection
```
accounts/{sanitized_email}
  ├── accountId
  ├── accountEmail
  ├── universityEmail
  ├── ragStore
  ├── accessibleStores[]
  └── ...
```

### Students Collection
```
students/{sanitized_email}
  ├── studentId
  ├── email
  ├── universityEmail
  ├── accessibleStores[]
  └── ...
```

### Chat Sessions Collection
```
chat_sessions/{email__sessionId}
  ├── sessionId
  ├── email
  ├── sessionName
  ├── messages[]
  └── ...
```

---

## 🛡️ Security Rules (Recommended)

Add these security rules in Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow server-side access via Admin SDK
    match /{document=**} {
      allow read, write: if false; // Default deny all client access
    }
  }
}
```

**Note:** Since you're using Firebase Admin SDK, all operations are server-side and bypass these rules.

---

## 📈 Performance Tips

### 1. Create Indexes
For frequently queried fields, create composite indexes in Firestore Console.

**Recommended Indexes:**
- `students`: (universityEmail, ASC)
- `accounts`: (universityEmail, ASC)
- `tickets`: (accountEmail, ASC), (studentEmail, ASC), (status, ASC)
- `chat_sessions`: (email, ASC), (createdAt, DESC)

### 2. Use Batch Operations
For bulk operations, use `FirestoreHelper.batchWrite()` to reduce costs.

### 3. Pagination
For large datasets, implement pagination:
```javascript
const query = db.collection('students')
    .limit(50)
    .startAfter(lastDoc);
```

---

## 🔧 Troubleshooting

### Error: "Firebase initialization error"
- Check that `firebase-service-account.json` exists and is valid
- Or verify environment variables are set correctly

### Error: "Permission denied"
- Firestore rules might be blocking access
- With Admin SDK, this shouldn't happen - check initialization

### Error: "Document not found"
- Verify the document ID is correctly sanitized
- Check Firestore Console to see actual document IDs

### Slow Performance
- Add indexes for frequently queried fields
- Use batch operations for multiple writes
- Consider enabling caching

---

## 🎯 Next Steps

1. ✅ Test all API endpoints
2. ✅ Migrate existing data (if any)
3. ✅ Set up Firestore security rules
4. ✅ Create backup strategy
5. ✅ Monitor usage in Firebase Console
6. ✅ Consider setting up Firestore backups

---

## 📚 Additional Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firestore Pricing](https://firebase.google.com/pricing)

---

## 💡 Important Notes

1. **Backup Strategy**: Set up automated backups using Firebase's export feature
2. **Cost Monitoring**: Monitor your Firestore usage in Firebase Console
3. **Security**: Never expose your service account credentials
4. **Indexes**: Create composite indexes for complex queries
5. **Testing**: Test thoroughly in a development environment first

---

**Need Help?** Check the Firebase documentation or open an issue on the project repository.
