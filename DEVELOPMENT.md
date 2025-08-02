# TossIt Development Guide

## Firebase Authentication & Permission Issues

If you encounter Firebase permission issues when developing locally, here's how to fix them:

### 1. Using the Development Mode

The app now has built-in workarounds to handle permission issues:

- **Client-side Error Handling**: The Firebase service modules have fallback mechanisms for development
- **Permissive Firestore Rules**: During development, the rules allow all operations

### 2. Manual Configuration Options

If you're still encountering issues:

#### Option A: Use Firebase Emulator (Recommended)

1. Make sure you have Java installed (required for Firebase emulators)
2. Install Firebase CLI:
   ```
   npm install -g firebase-tools
   ```
3. Login to Firebase:
   ```
   firebase login
   ```
4. Start the emulators:
   ```
   npm run emulators
   ```
5. In a separate terminal, start the development server:
   ```
   npm run dev
   ```

Alternatively, run both concurrently:
```
npm run dev:emulate
```

#### Option B: Modify Firestore Rules in Firebase Console

1. Go to the Firebase Console (https://console.firebase.google.com/)
2. Select your project
3. Go to Firestore > Rules
4. Temporarily replace the rules with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
5. Click "Publish"

**⚠️ IMPORTANT:** This makes your database completely open. Use only in development!

### 3. Check App Authentication

Make sure you're properly authenticated:

1. Sign out and sign back in to get a fresh authentication token
2. Check the console for auth-related errors
3. In your code, make sure you handle the auth initialization properly:
   ```javascript
   useEffect(() => {
     // Make sure auth is ready before trying to access data
     const unsubscribe = onAuthStateChanged(auth, (user) => {
       if (user) {
         // Now you can access data
       }
     });
     return () => unsubscribe();
   }, []);
   ```

### 4. Common Permission Issues

- **"Missing or insufficient permissions"**: Auth token is missing or doesn't have the required role
- **Products not loading**: Check that your user has a valid `businessId` field in their Firestore document
- **Can't create/update items**: Your user needs `isOnShift: true` in their Firestore document
- **Admin features not working**: Your user needs `role: "admin"` in their Firestore document

### 5. Development Utilities

For convenience, the Dashboard page includes:

- A "Fix Admin Permissions" button to grant admin role to your user
- A "Direct Admin Panel Link" button once you have admin permissions
- Debug information showing your current permissions and role 