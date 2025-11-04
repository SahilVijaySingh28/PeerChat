# FlashChat API Documentation

## Overview
FlashChat uses Firebase as its backend infrastructure, leveraging Firestore for real-time data storage and Firebase Authentication for user management. This document describes the data models, collections, and key operations used in the application.

## Authentication

### Firebase Authentication
FlashChat uses Firebase Authentication with Google Sign-In provider. User authentication is handled through the `signInWithGoogle` function in the auth service.

**Authentication Flow:**
1. User clicks "Sign in with Google"
2. Firebase handles the OAuth flow
3. Upon successful authentication, Firebase returns a user object
4. UserService creates a user document in Firestore if it doesn't exist

## Firestore Data Model

### Collections

#### 1. Users Collection
Stores user profile information and relationships.

**Document Structure:**
```javascript
{
  uid: string,              // Firebase Auth UID
  name: string,             // User's display name
  displayName: string,      // User's display name (from auth)
  email: string,            // User's email address
  photoURL: string,         // URL to user's profile picture
  friends: string[],        // Array of friend UIDs
  friendRequests: Array<{   // Array of friend request objects
    from: string,           // UID of requesting user
    fromEmail: string,      // Email of requesting user
    fromName: string,       // Name of requesting user
    timestamp: Date         // Request timestamp
  }>,
  notifications: Array<{    // Array of notification objects
    type: string,           // Notification type
    message: string,        // Notification message
    timestamp: Date,        // Notification timestamp
    read: boolean,          // Whether notification is read
    // Type-specific fields
  }>,
  createdAt: Date,          // Account creation timestamp
  lastLogin: Date,          // Last login timestamp
  isOnline: boolean,        // Current online status
  lastSeen: Date,           // Last seen timestamp
  onlineStatusPrivacy: string, // 'everyone', 'friends', or 'nobody'
  appearOffline: boolean    // Whether user appears offline
}
```

#### 2. Messages Collection
Stores chat messages between users.

**Document Structure:**
```javascript
{
  text: string,             // Message content
  name: string,             // Sender's name
  userId: string,           // Sender's UID
  recipientId: string,      // Recipient's UID
  timestamp: Date,          // Message timestamp
  you: boolean,             // Whether current user is sender
  photoURL: string          // Sender's photo URL
}
```

#### 3. Calls Collection
Stores WebRTC call signaling data.

**Document Structure:**
```javascript
{
  callerUid: string,        // Caller's UID
  calleeUid: string,        // Callee's UID
  createdAt: Date,          // Call creation timestamp
  status: string,           // 'initiated', 'ringing', 'accepted', 'declined', 'ended'
  endedAt: Date,            // Call end timestamp (nullable)
  ringingAt: Date,          // Ringing start timestamp (nullable)
  acceptedAt: Date,         // Call acceptance timestamp (nullable)
  declinedAt: Date,         // Call decline timestamp (nullable)
  offer: Object,            // WebRTC offer SDP (nullable)
  answer: Object,           // WebRTC answer SDP (nullable)
  // Subcollections for ICE candidates
}
```

**Subcollections:**
- `offerCandidates`: ICE candidates from the caller
- `answerCandidates`: ICE candidates from the callee

**ICE Candidate Document Structure:**
```javascript
{
  candidate: string,        // ICE candidate string
  sdpMid: string,           // SDP media identifier
  sdpMLineIndex: number,    // SDP media line index
  usernameFragment: string  // ICE username fragment
}
```

## API Operations

### User Management

#### Get Current User
```javascript
// Function: getCurrentUser()
// Returns the current authenticated user's data
const user = getCurrentUser();
```

#### Update User Profile
```javascript
// Function: updateUserProfile(displayName)
// Updates the current user's display name
await updateUserProfile('New Display Name');
```

#### Subscribe to Friends
```javascript
// Function: subscribeToFriends(callback)
// Subscribes to real-time updates of the user's friends list
const unsubscribe = subscribeToFriends((friends) => {
  // Handle friends list updates
});
```

#### Search Friends
```javascript
// Function: searchFriends(searchQuery)
// Searches within the current user's friends list
const friends = await searchFriends('John');
```

#### Search All Users
```javascript
// Function: searchAllUsers(searchQuery)
// Searches all users in the system
const users = await searchAllUsers('Jane');
```

### Friend Management

#### Send Friend Request
```javascript
// Function: sendFriendRequest(friendEmail)
// Sends a friend request to a user by email
await sendFriendRequest('friend@example.com');
```

#### Subscribe to Friend Requests
```javascript
// Function: subscribeToFriendRequests(callback)
// Subscribes to real-time updates of incoming friend requests
const unsubscribe = subscribeToFriendRequests((requests) => {
  // Handle friend request updates
});
```

#### Accept Friend Request
```javascript
// Function: acceptFriendRequest(request)
// Accepts a friend request
await acceptFriendRequest(requestObject);
```

#### Decline Friend Request
```javascript
// Function: declineFriendRequest(request)
// Declines a friend request
await declineFriendRequest(requestObject);
```

#### Unfriend User
```javascript
// Function: unfriendUser(friendUid)
// Removes a user from the current user's friends list
await unfriendUser('friendUid');
```

### Chat Operations

#### Send Message
```javascript
// Function: sendMessage(messageData, recipientUserId)
// Sends a message to a specific user
const messageId = await sendMessage({
  text: 'Hello!',
  name: 'John Doe',
  photoURL: 'https://example.com/avatar.jpg'
}, 'recipientUid');
```

#### Subscribe to Messages
```javascript
// Function: subscribeToMessages(selectedUserId, callback)
// Subscribes to real-time message updates for a conversation
const unsubscribe = subscribeToMessages('friendUid', (messages) => {
  // Handle message updates
});
```

#### Subscribe to Latest Messages
```javascript
// Function: subscribeToLatestMessages(callback)
// Subscribes to latest messages for conversation list
const unsubscribe = subscribeToLatestMessages((latestMessages) => {
  // Handle latest message updates
});
```

### Call Operations

#### Create Call Document
```javascript
// Function: createCallDocument(callerUid, calleeUid)
// Creates a Firestore document for a new call
const callId = await createCallDocument('callerUid', 'calleeUid');
```

#### Set Offer
```javascript
// Function: setOffer(callId, offer)
// Stores the WebRTC offer in Firestore
await setOffer('callId', {
  type: 'offer',
  sdp: 'offer-sdp-string'
});
```

#### Set Answer
```javascript
// Function: setAnswer(callId, answer)
// Stores the WebRTC answer in Firestore
await setAnswer('callId', {
  type: 'answer',
  sdp: 'answer-sdp-string'
});
```

#### Listen for Offer
```javascript
// Function: listenForOffer(callId, callback)
// Listens for WebRTC offers from the caller
const unsubscribe = listenForOffer('callId', (offer) => {
  // Handle received offer
});
```

#### Listen for Answer
```javascript
// Function: listenForAnswer(callId, callback)
// Listens for WebRTC answers from the callee
const unsubscribe = listenForAnswer('callId', (answer) => {
  // Handle received answer
});
```

#### Listen for Call Status
```javascript
// Function: listenForCallStatus(callId, callback)
// Listens for call status changes
const unsubscribe = listenForCallStatus('callId', (statusData) => {
  // Handle status updates
});
```

#### Update Call Status
```javascript
// Function: updateCallStatus(callId, status, additionalData)
// Updates the status of a call
await updateCallStatus('callId', 'accepted', {
  acceptedAt: new Date()
});
```

#### End Call
```javascript
// Function: endCall(callId)
// Ends a call
await endCall('callId');
```

#### Decline Call
```javascript
// Function: declineCall(callId)
// Declines a call
await declineCall('callId');
```

#### Cleanup Call Data
```javascript
// Function: cleanupCallData(callId)
// Cleans up Firestore data after a call ends
await cleanupCallData('callId');
```

#### Add ICE Candidate
```javascript
// Function: addIceCandidate(candidatesRef, candidate)
// Adds an ICE candidate to Firestore
await addIceCandidate(candidatesRef, {
  candidate: 'candidate-string',
  sdpMid: '0',
  sdpMLineIndex: 0
});
```

#### Listen for ICE Candidates
```javascript
// Function: listenForIceCandidates(candidatesRef, onCandidate)
// Listens for ICE candidates from the remote peer
const unsubscribe = listenForIceCandidates(candidatesRef, (candidate) => {
  // Handle received candidate
});
```

## Security Rules

### Firestore Security Rules
The following security rules should be implemented in Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Allow users to read their own document
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Allow users to create their own document
      allow create: if request.auth != null && request.auth.uid == userId;
      
      // Allow users to update their own document
      allow update: if request.auth != null && request.auth.uid == userId;
      
      // Subcollections
      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
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

## Rate Limiting

### Call Rate Limiting
To prevent abuse, FlashChat implements rate limiting for calls:

```javascript
// Rate limiting configuration
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const MAX_CALLS_PER_WINDOW = 3;  // Max 3 calls per window
```

## Error Handling

### Common Error Types
1. **Permission Denied**: User lacks permissions for an operation
2. **Not Found**: Requested resource doesn't exist
3. **Resource Exhausted**: Quota or rate limit exceeded
4. **Unavailable**: Service temporarily unavailable
5. **Deadline Exceeded**: Operation timed out

### Error Response Format
```javascript
{
  code: string,        // Error code (e.g., 'permission-denied')
  message: string,     // Human-readable error message
  details: Object      // Additional error details
}
```

## Performance Considerations

### Query Optimization
1. **Indexing**: Create composite indexes for complex queries
2. **Pagination**: Use limits and cursors for large result sets
3. **Caching**: Leverage Firestore's offline persistence
4. **Batch Operations**: Use batch writes for multiple updates

### Data Structure Optimization
1. **Denormalization**: Duplicate data to avoid expensive joins
2. **Sharding**: Distribute data across multiple documents for high-write scenarios
3. **Aggregation**: Precompute aggregated data for frequently accessed statistics

This API documentation provides a comprehensive overview of FlashChat's data model and operations, enabling developers to understand and extend the application effectively.