# FlashChat Deployment Guide

## Overview
This guide provides instructions for deploying the FlashChat application to various environments, including development, staging, and production. FlashChat uses Firebase for backend services and can be deployed using Firebase Hosting.

## Prerequisites

### Software Requirements
1. **Node.js** (v16 or higher)
2. **npm** (v8 or higher) or **yarn** (v1.22 or higher)
3. **Firebase CLI** (v10 or higher)
4. **Git** (v2.30 or higher)

### Installation
```bash
# Install Node.js (https://nodejs.org/)
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login
```

## Project Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/flashchat.git
cd flashchat
```

### 2. Install Dependencies
```bash
# Using npm
npm install

# Using yarn
yarn install
```

### 3. Configure Firebase
1. Create a Firebase project at https://console.firebase.google.com/
2. Register your app in the Firebase console
3. Update the Firebase configuration in `src/config/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};
```

### 4. Initialize Firebase Project
```bash
firebase init
```
Select the following features:
- Firestore
- Hosting
- Authentication

## Development Deployment

### Local Development
```bash
# Start development server
npm run dev

# The application will be available at http://localhost:5173
```

### Development Environment Variables
Create a `.env.development` file in the project root:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Production Deployment

### Build for Production
```bash
# Build the application
npm run build

# The built files will be in the `dist` directory
```

### Deploy to Firebase Hosting
```bash
# Deploy to Firebase Hosting
firebase deploy

# Deploy only hosting (if you want to deploy selectively)
firebase deploy --only hosting
```

### Production Environment Variables
Create a `.env.production` file in the project root:
```env
VITE_FIREBASE_API_KEY=your-production-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-production-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-production-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-production-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-production-sender-id
VITE_FIREBASE_APP_ID=your-production-app-id
```

## Firebase Configuration

### Firestore Security Rules
Update `firestore.rules` with appropriate security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }
    
    // Messages collection
    match /messages/{messageId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         resource.data.recipientId == request.auth.uid);
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
    
    // Calls collection
    match /calls/{callId} {
      allow read: if request.auth != null && 
        (resource.data.callerUid == request.auth.uid || 
         resource.data.calleeUid == request.auth.uid);
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (request.auth.uid == resource.data.callerUid || 
         request.auth.uid == resource.data.calleeUid);
      allow delete: if request.auth != null && 
        (request.auth.uid == resource.data.callerUid || 
         request.auth.uid == resource.data.calleeUid);
    }
  }
}
```

### Firebase Hosting Configuration
Update `firebase.json`:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## Continuous Deployment

### GitHub Actions
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Deploy to Firebase
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only hosting
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

### Environment Secrets
Set the following secrets in your GitHub repository:
- `FIREBASE_TOKEN`: Firebase CI token (generate with `firebase login:ci`)

## Monitoring and Analytics

### Firebase Analytics
FlashChat includes Firebase Analytics for monitoring user behavior:

```javascript
// Initialize Analytics
import { getAnalytics } from 'firebase/analytics';
const analytics = getAnalytics(app);
```

### Performance Monitoring
Monitor key performance metrics:
- Page load times
- API response times
- User engagement metrics

### Error Tracking
Implement error tracking with:
- Console logging
- Firebase Crashlytics (if added)
- Third-party error tracking services

## Backup and Recovery

### Firestore Backups
Enable automatic backups in the Firebase Console:
1. Go to Firestore settings
2. Enable automatic backups
3. Configure backup schedule

### Manual Backups
```bash
# Export Firestore data
gcloud firestore export gs://[BUCKET_NAME]

# Import Firestore data
gcloud firestore import gs://[BUCKET_NAME]/[EXPORT_NAME]
```

## Scaling Considerations

### Firestore Scaling
1. **Indexing**: Create composite indexes for complex queries
2. **Sharding**: Distribute data across multiple documents for high-write scenarios
3. **Batch Operations**: Use batch writes for multiple updates
4. **Pagination**: Implement pagination for large result sets

### WebRTC Scaling
1. **TURN Servers**: Deploy your own TURN servers for production
2. **Bandwidth Management**: Monitor and limit bandwidth usage
3. **Connection Limits**: Implement connection limits per user

### CDN Configuration
Firebase Hosting automatically uses a CDN, but you can:
1. Configure custom domains
2. Set up SSL certificates
3. Configure caching headers

## Troubleshooting

### Common Issues

#### 1. Deployment Fails
```bash
# Check Firebase CLI version
firebase --version

# Re-authenticate if needed
firebase login

# Check project configuration
firebase projects:list
```

#### 2. Build Errors
```bash
# Clear build cache
rm -rf node_modules/.vite
npm run build -- --force

# Check for TypeScript errors
npm run type-check
```

#### 3. Runtime Errors
```bash
# Check browser console for errors
# Verify Firebase configuration
# Check network requests
```

### Debugging Tools
1. **Browser DevTools**: Network, Console, and Performance tabs
2. **Firebase Console**: Logs, Analytics, and Performance monitoring
3. **Vite Dev Server**: Hot module replacement and error overlay

## Security Best Practices

### Authentication Security
1. Use Firebase Authentication with secure providers
2. Implement proper session management
3. Use secure HTTP headers
4. Implement rate limiting

### Data Security
1. Implement Firestore security rules
2. Validate all user inputs
3. Sanitize data before displaying
4. Use parameterized queries

### Network Security
1. Use HTTPS for all communications
2. Implement Content Security Policy (CSP)
3. Use secure cookies
4. Implement proper CORS configuration

## Maintenance

### Regular Updates
1. Update dependencies regularly
2. Monitor for security vulnerabilities
3. Update Firebase SDK versions
4. Review and update security rules

### Performance Monitoring
1. Monitor Firestore usage and costs
2. Track user engagement metrics
3. Monitor WebRTC connection quality
4. Review and optimize build performance

This deployment guide provides a comprehensive overview of deploying FlashChat to various environments, ensuring a smooth and secure deployment process.