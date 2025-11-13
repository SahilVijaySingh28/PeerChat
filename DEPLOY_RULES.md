# How to Deploy Firestore Rules

## Option 1: Using Firebase CLI (Recommended)

1. **Login to Firebase** (if not already logged in):
   ```bash
   firebase login
   ```

2. **Deploy the rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Option 2: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **peerchat-bea12**
3. Go to **Firestore Database** → **Rules** tab
4. Copy the contents of `firestore.rules` file
5. Paste into the rules editor
6. Click **Publish**

## Current Rules

The rules require authentication for all operations:
- Authenticated users can read all user documents
- Authenticated users can write to user documents (for friend requests, etc.)
- All operations require `request.auth != null`

After deploying, refresh your app and the permission errors should be resolved.

