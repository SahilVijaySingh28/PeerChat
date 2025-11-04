# Call Service Documentation

## Overview
The Call Service handles WebRTC-based audio and video calling functionality in FlashChat, including call signaling through Firestore, ICE candidate exchange, and call status management.

## WebRTC Configuration

### rtcConfiguration
Configuration object for RTCPeerConnection with STUN/TURN servers.

```javascript
{
  iceServers: [
    // Google STUN servers
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    // Additional STUN servers
    { urls: ['stun:stun.stunprotocol.org:3478'] }
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
}
```

## Call Management Functions

### createCallDocument(callerUid, calleeUid)
Creates a Firestore document to represent a new call.

**Parameters:**
- `callerUid` (String): Firebase UID of the calling user
- `calleeUid` (String): Firebase UID of the user being called

**Returns:**
- Promise resolving to the call document ID

### setOffer(callId, offer)
Stores the WebRTC offer in Firestore for the callee to retrieve.

**Parameters:**
- `callId` (String): The Firestore document ID of the call
- `offer` (Object): The WebRTC offer SDP

### setAnswer(callId, answer)
Stores the WebRTC answer in Firestore for the caller to retrieve.

**Parameters:**
- `callId` (String): The Firestore document ID of the call
- `answer` (Object): The WebRTC answer SDP

### listenForOffer(callId, callback)
Listens for WebRTC offers from the caller.

**Parameters:**
- `callId` (String): The Firestore document ID of the call
- `callback` (Function): Called when an offer is received

**Returns:**
- Unsubscribe function to clean up the listener

### listenForAnswer(callId, callback)
Listens for WebRTC answers from the callee.

**Parameters:**
- `callId` (String): The Firestore document ID of the call
- `callback` (Function): Called when an answer is received

**Returns:**
- Unsubscribe function to clean up the listener

### listenForCallStatus(callId, callback)
Listens for changes to the call status.

**Parameters:**
- `callId` (String): The Firestore document ID of the call
- `callback` (Function): Called when the call status changes

**Returns:**
- Unsubscribe function to clean up the listener

### updateCallStatus(callId, status, additionalData)
Updates the status of a call in Firestore.

**Parameters:**
- `callId` (String): The Firestore document ID of the call
- `status` (String): The new call status ('initiated', 'ringing', 'accepted', 'declined', 'ended')
- `additionalData` (Object): Optional additional data to store with the status update

**Returns:**
- Promise resolving to true if successful

### endCall(callId)
Ends a call by updating its status to 'ended'.

**Parameters:**
- `callId` (String): The Firestore document ID of the call

**Returns:**
- Promise resolving to true if successful

### declineCall(callId)
Declines a call by updating its status to 'declined'.

**Parameters:**
- `callId` (String): The Firestore document ID of the call

**Returns:**
- Promise resolving to true if successful

### cleanupCallData(callId)
Cleans up Firestore data associated with a call after it ends.

**Parameters:**
- `callId` (String): The Firestore document ID of the call

## ICE Candidate Management

### offerCandidatesCollection(callId)
Gets a reference to the Firestore collection for storing caller ICE candidates.

**Parameters:**
- `callId` (String): The Firestore document ID of the call

**Returns:**
- Firestore collection reference

### answerCandidatesCollection(callId)
Gets a reference to the Firestore collection for storing callee ICE candidates.

**Parameters:**
- `callId` (String): The Firestore document ID of the call

**Returns:**
- Firestore collection reference

### listenForIceCandidates(candidatesRef, onCandidate)
Listens for ICE candidates from the remote peer.

**Parameters:**
- `candidatesRef` (Object): Firestore collection reference for ICE candidates
- `onCandidate` (Function): Called when an ICE candidate is received

**Returns:**
- Unsubscribe function to clean up the listener

### addIceCandidate(candidatesRef, candidate)
Adds an ICE candidate to Firestore for the remote peer to retrieve.

**Parameters:**
- `candidatesRef` (Object): Firestore collection reference for ICE candidates
- `candidate` (RTCIceCandidate): The ICE candidate to add

## Rate Limiting

### checkRateLimit(userId)
Checks if a user has exceeded the call rate limit.

**Parameters:**
- `userId` (String): Firebase UID of the user

**Returns:**
- Promise resolving to an object with `allowed` (Boolean) and `timeLeft` (Number) properties