/**
 * Utility functions for handling errors
 */

/**
 * Handle Firebase errors and return user-friendly messages
 * @param {Error} error - Firebase error
 * @returns {string} User-friendly error message
 */
export const handleFirebaseError = (error) => {
  if (!error || !error.code) {
    return 'An unknown error occurred';
  }
  
  switch (error.code) {
    case 'auth/user-not-found':
      return 'User not found. Please check your credentials.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-email':
      return 'Invalid email address. Please check your email.';
    case 'auth/email-already-in-use':
      return 'Email already in use. Please use a different email.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use a stronger password.';
    case 'auth/too-many-requests':
      return 'Too many requests. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign in cancelled. Please try again.';
    case 'permission-denied':
      return 'Permission denied. You may not have access to this resource.';
    case 'not-found':
      return 'Resource not found.';
    case 'resource-exhausted':
      return 'Rate limit exceeded. Please wait a moment and try again.';
    case 'unavailable':
      return 'Service temporarily unavailable. Please try again later.';
    case 'deadline-exceeded':
      return 'Request timed out. Please try again.';
    default:
      console.error('Unhandled Firebase error:', error);
      return error.message || 'An error occurred. Please try again.';
  }
};

/**
 * Handle Firestore errors
 * @param {Error} error - Firestore error
 * @returns {string} User-friendly error message
 */
export const handleFirestoreError = (error) => {
  if (!error || !error.code) {
    return 'An unknown error occurred';
  }
  
  switch (error.code) {
    case 'resource-exhausted':
      return 'Quota exceeded. Please wait a few minutes before trying again.';
    case 'permission-denied':
      return 'Permission denied. Check Firestore rules.';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'Network error. Retrying...';
    default:
      console.error('Firestore error:', error);
      return error.message || 'A database error occurred. Please try again.';
  }
};

/**
 * Handle WebRTC errors
 * @param {Error} error - WebRTC error
 * @returns {string} User-friendly error message
 */
export const handleWebRTCError = (error) => {
  if (!error) {
    return 'An unknown WebRTC error occurred';
  }
  
  if (error.name === 'NotAllowedError') {
    return 'Permission denied. Please allow access to camera and microphone.';
  }
  
  if (error.name === 'NotFoundError') {
    return 'No camera or microphone found. Please check your devices.';
  }
  
  if (error.name === 'NotReadableError') {
    return 'Could not access camera or microphone. Device may be in use.';
  }
  
  if (error.name === 'OverconstrainedError') {
    return 'Camera or microphone constraints could not be satisfied.';
  }
  
  if (error.name === 'TypeError') {
    return 'Invalid configuration. Please check your settings.';
  }
  
  console.error('WebRTC error:', error);
  return error.message || 'A WebRTC error occurred. Please try again.';
};

/**
 * Log error with context
 * @param {string} context - Context where error occurred
 * @param {Error} error - Error object
 * @param {Object} additionalInfo - Additional information
 */
export const logError = (context, error, additionalInfo = {}) => {
  console.error(`[${context}] Error:`, {
    message: error.message,
    code: error.code,
    stack: error.stack,
    ...additionalInfo
  });
};