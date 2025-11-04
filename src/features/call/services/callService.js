import { db } from '@/config/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';

/**
 * Enhanced STUN/TURN servers for WebRTC with better compatibility
 */
export const rtcConfiguration = {
  iceServers: [
    // Google STUN servers
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    // Additional STUN servers for better connectivity
    { urls: ['stun:stun.stunprotocol.org:3478'] },
    // TURN servers (you may want to add your own TURN server for production)
    // Example TURN server configuration:
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'your-username',
    //   credential: 'your-password'
    // }
  ],
  // Add these for better compatibility
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

// Improved rate limiting with more reasonable thresholds
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const MAX_CALLS_PER_WINDOW = 3; // Allow 3 calls per window

/**
 * Check rate limit based on recent call attempts (simplified to avoid index requirement)
 * @param {string} userId - The Firebase UID of the user
 * @returns {Promise<Object>} - Object with allowed flag and timeLeft if limited
 */
export const checkRateLimit = async (userId) => {
  try {
    const callsRef = collection(db, 'calls');
    const tenSecondsAgo = new Date(Date.now() - RATE_LIMIT_WINDOW);
    
    // Simplified query to avoid composite index requirement
    const q = query(
      callsRef,
      where('callerUid', '==', userId),
      where('createdAt', '>', tenSecondsAgo),
      limit(MAX_CALLS_PER_WINDOW * 2) // Get more to filter manually
    );
    
    const querySnapshot = await getDocs(q);
    
    // Manually filter and count recent calls
    let recentCallCount = 0;
    const now = Date.now();
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.createdAt && data.createdAt.toDate) {
        const callTime = data.createdAt.toDate().getTime();
        if (now - callTime < RATE_LIMIT_WINDOW) {
          recentCallCount++;
        }
      }
    });
    
    // If we have reached the limit, reject the call
    if (recentCallCount >= MAX_CALLS_PER_WINDOW) {
      console.warn(`Rate limit exceeded. Recent calls: ${recentCallCount}`);
      return { allowed: false, timeLeft: Math.ceil(RATE_LIMIT_WINDOW / 1000) };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // In case of error, allow the call to proceed
    return { allowed: true };
  }
};

/**
 * Create a call document with proper lifecycle state tracking
 * @param {string} callerUid - The Firebase UID of the caller
 * @param {string} calleeUid - The Firebase UID of the callee
 * @returns {Promise<string>} - The ID of the created call document
 */
export async function createCallDocument(callerUid, calleeUid) {
  const rateCheck = await checkRateLimit(callerUid);
  if (!rateCheck.allowed) {
    throw new Error(`Rate limit exceeded. Please wait ${rateCheck.timeLeft} seconds.`);
  }
  
  const callsRef = collection(db, 'calls');
  const callDocRef = await addDoc(callsRef, {
    callerUid,
    calleeUid,
    createdAt: serverTimestamp(),
    status: 'initiated',
    endedAt: null
  });
  return callDocRef.id;
}

/**
 * Set the WebRTC offer in Firestore
 * @param {string} callId - The ID of the call document
 * @param {Object} offer - The WebRTC offer SDP
 * @returns {Promise<void>}
 */
export async function setOffer(callId, offer) {
  try {
    console.log('Setting offer in Firestore:', offer);
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, { 
      offer, 
      status: 'ringing',
      ringingAt: serverTimestamp()
    });
    console.log('Successfully set offer in Firestore');
  } catch (error) {
    console.error('Error setting offer:', error);
    throw error;
  }
}

/**
 * Set the WebRTC answer in Firestore
 * @param {string} callId - The ID of the call document
 * @param {Object} answer - The WebRTC answer SDP
 * @returns {Promise<void>}
 */
export async function setAnswer(callId, answer) {
  try {
    console.log('Setting answer in Firestore:', answer);
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, { 
      answer, 
      status: 'accepted',
      acceptedAt: serverTimestamp()
    });
    console.log('Successfully set answer in Firestore');
  } catch (error) {
    console.error('Error setting answer:', error);
    throw error;
  }
}

/**
 * Listen for WebRTC answers from the callee
 * @param {string} callId - The ID of the call document
 * @param {Function} callback - Called when an answer is received
 * @returns {Function} - Unsubscribe function to clean up the listener
 */
export function listenForAnswer(callId, callback) {
  const callRef = doc(db, 'calls', callId);
  // Track the last answer we've seen to prevent duplicate callbacks
  let lastAnswer = null;
  
  const unsubscribe = onSnapshot(callRef, (snapshot) => {
    const data = snapshot.data();
    if (data && data.answer) {
      // Create a simple hash of the answer to detect changes
      const answerStr = JSON.stringify(data.answer);
      if (lastAnswer !== answerStr) {
        lastAnswer = answerStr;
        console.log('Received answer via Firestore:', data.answer);
        callback(data.answer);
      } else {
        console.log('Ignoring duplicate answer');
      }
    }
  }, (error) => {
    console.error('Error listening for answer:', error);
  });
  
  // Return the unsubscribe function
  return unsubscribe;
}

/**
 * Listen for WebRTC offers from the caller
 * @param {string} callId - The ID of the call document
 * @param {Function} callback - Called when an offer is received
 * @returns {Function} - Unsubscribe function to clean up the listener
 */
export function listenForOffer(callId, callback) {
  const callRef = doc(db, 'calls', callId);
  // Track the last offer we've seen to prevent duplicate callbacks
  let lastOffer = null;
  
  const unsubscribe = onSnapshot(callRef, (snapshot) => {
    const data = snapshot.data();
    if (data && data.offer) {
      // Create a simple hash of the offer to detect changes
      const offerStr = JSON.stringify(data.offer);
      if (lastOffer !== offerStr) {
        lastOffer = offerStr;
        console.log('Received offer via Firestore:', data.offer);
        callback(data.offer);
      } else {
        console.log('Ignoring duplicate offer');
      }
    }
  }, (error) => {
    console.error('Error listening for offer:', error);
  });
  
  // Return the unsubscribe function
  return unsubscribe;
}

/**
 * Listen for call status changes with improved error handling and status detection
 * @param {string} callId - The ID of the call document
 * @param {Function} callback - Called when the call status changes
 * @returns {Function} - Unsubscribe function to clean up the listener
 */
export function listenForCallStatus(callId, callback) {
  const callRef = doc(db, 'calls', callId);
  const unsubscribe = onSnapshot(callRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      // Ensure we're properly detecting all status changes including endedAt
      callback(data);
    } else {
      // Document was deleted, treat as ended call
      callback({ status: 'ended' });
    }
  }, (error) => {
    console.error('Error listening for call status:', error);
    // Call the callback with an ended status to clean up
    callback({ status: 'ended' });
  });
  
  // Return the unsubscribe function
  return unsubscribe;
}

// Function to update call status with retry logic and duplicate prevention
const callStatusCache = new Map();

/**
 * Update the status of a call in Firestore
 * @param {string} callId - The ID of the call document
 * @param {string} status - The new call status
 * @param {Object} additionalData - Optional additional data to store with the status update
 * @returns {Promise<boolean>} - True if successful
 */
export async function updateCallStatus(callId, status, additionalData = {}) {
  // Create a cache key for this specific call and status
  const cacheKey = `${callId}-${status}`;
  const now = Date.now();
  
  // Check if we've recently updated this status
  if (callStatusCache.has(cacheKey)) {
    const lastUpdate = callStatusCache.get(cacheKey);
    // If less than 1 second ago, skip to prevent duplicates
    if (now - lastUpdate < 1000) {
      console.log(`Skipping duplicate status update for ${callId} to ${status}`);
      return true;
    }
  }
  
  // Update the cache
  callStatusCache.set(cacheKey, now);
  
  try {
    const callRef = doc(db, 'calls', callId);
    
    // Simple update without transaction to avoid precondition failures
    const updateData = { status, ...additionalData };
    
    // Add timestamp based on status
    if (status === 'ended') {
      updateData.endedAt = serverTimestamp();
    } else if (status === 'accepted') {
      updateData.acceptedAt = serverTimestamp();
    } else if (status === 'declined') {
      updateData.declinedAt = serverTimestamp();
    } else if (status === 'ringing') {
      updateData.ringingAt = serverTimestamp();
    }
    
    await updateDoc(callRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating call status:', error);
    // Try one more time
    try {
      const callRef = doc(db, 'calls', callId);
      const updateData = { status, ...additionalData };
      
      if (status === 'ended') {
        updateData.endedAt = serverTimestamp();
      } else if (status === 'accepted') {
        updateData.acceptedAt = serverTimestamp();
      } else if (status === 'declined') {
        updateData.declinedAt = serverTimestamp();
      } else if (status === 'ringing') {
        updateData.ringingAt = serverTimestamp();
      }
      
      await updateDoc(callRef, updateData);
      return true;
    } catch (retryError) {
      console.error('Retry failed for updating call status:', retryError);
      return false;
    }
  }
}

/**
 * End a call and update status
 * @param {string} callId - The ID of the call document
 * @returns {Promise<boolean>} - True if successful
 */
export async function endCall(callId) {
  try {
    console.log('Ending call with ID:', callId); // Debug log
    const result = await updateCallStatus(callId, 'ended');
    console.log('Call end result:', result); // Debug log
    return result;
  } catch (error) {
    console.error('Error ending call:', error);
    return false;
  }
}

/**
 * Decline a call
 * @param {string} callId - The ID of the call document
 * @returns {Promise<boolean>} - True if successful
 */
export async function declineCall(callId) {
  try {
    return await updateCallStatus(callId, 'declined');
  } catch (error) {
    console.error('Error declining call:', error);
    return false;
  }
}

/**
 * Clean up call signaling data
 * @param {string} callId - The ID of the call document
 * @returns {Promise<void>}
 */
export async function cleanupCallData(callId) {
  try {
    // Delete ICE candidate subcollections
    const offerCandidatesRef = collection(doc(db, 'calls', callId), 'offerCandidates');
    const answerCandidatesRef = collection(doc(db, 'calls', callId), 'answerCandidates');
    
    // Get and delete offer candidates
    const offerCandidatesSnapshot = await getDocs(offerCandidatesRef);
    const deleteOfferPromises = offerCandidatesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    // Get and delete answer candidates
    const answerCandidatesSnapshot = await getDocs(answerCandidatesRef);
    const deleteAnswerPromises = answerCandidatesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    // Wait for all deletions
    await Promise.all([...deleteOfferPromises, ...deleteAnswerPromises]);
    
    // Finally delete the call document itself
    await deleteDoc(doc(db, 'calls', callId));
  } catch (error) {
    console.error('Error cleaning up call data:', error);
  }
}

/**
 * Get reference to offer candidates collection
 * @param {string} callId - The ID of the call document
 * @returns {Object} - Firestore collection reference
 */
export function offerCandidatesCollection(callId) {
  return collection(doc(db, 'calls', callId), 'offerCandidates');
}

/**
 * Get reference to answer candidates collection
 * @param {string} callId - The ID of the call document
 * @returns {Object} - Firestore collection reference
 */
export function answerCandidatesCollection(callId) {
  return collection(doc(db, 'calls', callId), 'answerCandidates');
}

/**
 * Listen for ICE candidates from the remote peer
 * @param {Object} candidatesRef - Firestore collection reference for ICE candidates
 * @param {Function} onCandidate - Called when an ICE candidate is received
 * @returns {Function} - Unsubscribe function to clean up the listener
 */
export function listenForIceCandidates(candidatesRef, onCandidate) {
  const unsubscribe = onSnapshot(candidatesRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        console.log('Received ICE candidate via Firestore:', data);
        // Validate candidate before passing to callback
        if (data && typeof data === 'object' && (data.candidate || data.candidate === '')) {
          onCandidate(data);
        } else {
          console.warn('Invalid ICE candidate received, skipping:', data);
        }
      }
    });
  }, (error) => {
    console.error('Error listening for ICE candidates:', error);
  });
  
  // Return the unsubscribe function
  return unsubscribe;
}

/**
 * Add an ICE candidate to Firestore for the remote peer to retrieve
 * @param {Object} candidatesRef - Firestore collection reference for ICE candidates
 * @param {RTCIceCandidate} candidate - The ICE candidate to add
 * @returns {Promise<void>}
 */
export async function addIceCandidate(candidatesRef, candidate) {
  try {
    console.log('Adding ICE candidate to Firestore:', candidate);
    
    // Convert RTCIceCandidate to plain object before storing in Firestore
    let candidateData;
    if (candidate instanceof RTCIceCandidate) {
      // Extract properties from RTCIceCandidate
      candidateData = {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
        usernameFragment: candidate.usernameFragment
      };
    } else if (candidate && typeof candidate === 'object') {
      // Already a plain object
      candidateData = candidate;
    } else {
      console.warn('Invalid ICE candidate object, skipping:', candidate);
      return;
    }
    
    // Validate the candidate object before adding to Firestore
    if (!candidateData || typeof candidateData !== 'object') {
      console.warn('Invalid ICE candidate object, skipping:', candidateData);
      return;
    }
    
    // Ensure the candidate has the required properties
    if (candidateData.candidate === undefined && candidateData.sdpMid === undefined) {
      console.warn('ICE candidate missing required properties, skipping:', candidateData);
      return;
    }
    
    // Additional validation for candidate structure
    if (candidateData.candidate !== null && candidateData.candidate !== undefined && typeof candidateData.candidate !== 'string') {
      console.warn('ICE candidate has invalid candidate property, skipping:', candidateData);
      return;
    }
    
    // Validate sdpMid if present
    if (candidateData.sdpMid !== undefined && candidateData.sdpMid !== null && typeof candidateData.sdpMid !== 'string') {
      console.warn('ICE candidate has invalid sdpMid property, skipping:', candidateData);
      return;
    }
    
    // Validate sdpMLineIndex if present
    if (candidateData.sdpMLineIndex !== undefined && typeof candidateData.sdpMLineIndex !== 'number') {
      console.warn('ICE candidate has invalid sdpMLineIndex property, skipping:', candidateData);
      return;
    }
    
    await addDoc(candidatesRef, candidateData);
    console.log('Successfully added ICE candidate to Firestore');
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
    // Don't throw the error to prevent breaking the call flow
  }
}