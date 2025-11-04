import { auth, db } from '@/config/firebase';
import { 
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection, 
  query, 
  where, 
  onSnapshot,
  arrayUnion,
  arrayRemove,
  updateDoc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { handleFirestoreError } from '@/config/firebase';

// Function to get higher quality Google profile image
const getHighQualityPhotoURL = (photoURL) => {
  // If no photoURL, return null
  if (!photoURL) return null;
  
  try {
    // For Google profile pictures, we can request higher quality by modifying the URL
    // Google profile picture URLs typically end with ?sz= or have size parameters
    if (photoURL.includes('googleusercontent.com')) {
      // Remove any existing size parameters and set to higher quality (200px)
      let highQualityURL = photoURL.replace(/=s\d+/, '=s200');
      // If no size parameter exists, add one
      if (!photoURL.includes('=s')) {
        highQualityURL = photoURL.includes('?') 
          ? photoURL + '&sz=200' 
          : photoURL + '?sz=200';
      }
      return highQualityURL;
    }
    
    // Return original photoURL if not a Google profile picture
    return photoURL;
  } catch (error) {
    // If any error occurs, return the original photoURL
    console.warn('Error processing photoURL, returning original:', photoURL);
    return photoURL;
  }
};

// Current user state - now stores the full user data including Firestore data
let currentUser = null;
let currentUserFirestoreData = null; // Store Firestore data separately
let userActivityTimer = null; // Timer to track user activity
let isUserActive = true; // Track if user is actively using the app

// Function to initialize authentication
export const initAuth = () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Set the auth user first
        currentUser = user;
        
        // Only interact with Firestore if it's available
        if (db) {
          try {
            // Check if user document exists in Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (!userDoc.exists()) {
              // Create user document if it doesn't exist
              const userData = {
                uid: user.uid,
                name: user.displayName || user.email || `User${Math.floor(Math.random() * 10000)}`,
                displayName: user.displayName,
                email: user.email || '',
                photoURL: getHighQualityPhotoURL(user.photoURL) || user.photoURL || '', // Keep original if processing fails
                friends: [], // Initialize empty friends array
                friendRequests: [], // Initialize empty friend requests array
                notifications: [], // Initialize empty notifications array
                createdAt: new Date(),
                // Online status privacy settings
                onlineStatusPrivacy: 'friends', // 'everyone', 'friends', 'nobody'
                isOnline: true, // Set as online when creating account
                lastSeen: new Date(),
                appearOffline: false // Default to not appearing offline
              };
              
              await setDoc(doc(db, 'users', user.uid), userData);
              currentUserFirestoreData = userData;
            } else {
              // Update user document with latest data if it exists
              const userData = userDoc.data();
              // Ensure we're using high quality images
              if (userData.photoURL) {
                userData.photoURL = getHighQualityPhotoURL(userData.photoURL) || userData.photoURL;
              }
              
              // Ensure friends array exists
              if (!Array.isArray(userData.friends)) {
                userData.friends = [];
              }
              
              // Ensure friendRequests array exists
              if (!Array.isArray(userData.friendRequests)) {
                userData.friendRequests = [];
              }
              
              // Ensure notifications array exists
              if (!Array.isArray(userData.notifications)) {
                userData.notifications = [];
              }
              
              currentUserFirestoreData = userData;
              
              // Update Firestore with latest auth data
              const updatedData = {
                uid: user.uid,
                name: user.displayName || user.email || `User${Math.floor(Math.random() * 10000)}`,
                displayName: user.displayName,
                email: user.email || '',
                photoURL: getHighQualityPhotoURL(user.photoURL) || user.photoURL || '', // Keep original if processing fails
                friends: userData.friends, // Preserve existing friends array
                friendRequests: userData.friendRequests, // Preserve existing friendRequests array
                notifications: userData.notifications, // Preserve existing notifications array
                lastLogin: new Date()
              };
              
              await setDoc(doc(db, 'users', user.uid), updatedData, { merge: true });
              
              // Set user as online when they sign in, unless they've chosen to appear offline
              if (!userData.appearOffline) {
                await updateUserOnlineStatus(true);
              } else {
                // Ensure they're marked as offline if they've chosen to appear offline
                await updateUserOnlineStatus(false);
              }
            }
          } catch (error) {
            handleFirestoreError(error);
            // Continue with authentication even if Firestore fails
          }
        }
        
        resolve(user);
      } else {
        // No user is signed in
        currentUser = null;
        currentUserFirestoreData = null;
        resolve(null);
      }
      
      // Unsubscribe after first call
      unsubscribe();
    });
  });
};

// Function to sign in with Google
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    
    // Only interact with Firestore if it's available
    if (db) {
      try {
        // Create or update user document in Firestore
        const userData = {
          uid: currentUser.uid,
          name: currentUser.displayName || currentUser.email || `User${currentUser.uid.substring(0, 5)}`,
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: getHighQualityPhotoURL(currentUser.photoURL) || currentUser.photoURL || '', // Keep original if processing fails
          lastLogin: new Date(),
          appearOffline: false // Default to not appearing offline
        };
        
        await setDoc(doc(db, 'users', currentUser.uid), userData, { merge: true });
        currentUserFirestoreData = userData;
        
        // Set user as online when they sign in, unless they've chosen to appear offline
        if (!userData.appearOffline) {
          await updateUserOnlineStatus(true);
        } else {
          // Ensure they're marked as offline if they've chosen to appear offline
          await updateUserOnlineStatus(false);
        }
      } catch (error) {
        handleFirestoreError(error);
        // Continue with authentication even if Firestore fails
      }
    }
    
    return currentUser;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

// Function to sign out
export const signOutUser = async () => {
  try {
    // Set user as offline before signing out
    await updateUserOnlineStatus(false);
    
    await signOut(auth);
    currentUser = null;
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// Function to update user's online status
export const updateUserOnlineStatus = async (isOnline) => {
  if (!currentUser || !db) return;

  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    const updateData = {
      isOnline: isOnline,
      lastSeen: isOnline ? serverTimestamp() : new Date()
    };
    
    await updateDoc(userDocRef, updateData);
  } catch (error) {
    console.error('Error updating user online status:', error);
  }
};

// Function to set user to appear offline
export const setAppearOffline = async (appearOffline) => {
  if (!currentUser || !db) return;

  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, {
      appearOffline: appearOffline
    });
  } catch (error) {
    console.error('Error updating appear offline status:', error);
  }
};

// Function to update user's online status privacy settings
export const updateUserOnlineStatusPrivacy = async (privacySetting) => {
  if (!currentUser || !db) return;

  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, {
      onlineStatusPrivacy: privacySetting
    });
  } catch (error) {
    console.error('Error updating user online status privacy:', error);
  }
};

// Function to check if current user can see another user's online status
export const canSeeOnlineStatus = (targetUser) => {
  if (!currentUser || !targetUser) return false;
  
  // Always can see own status
  if (currentUser.uid === targetUser.uid) return true;
  
  // Check privacy settings
  const privacy = targetUser.onlineStatusPrivacy || 'friends';
  
  switch (privacy) {
    case 'everyone':
      return true;
    case 'nobody':
      return false;
    case 'friends':
    default:
      // Check if current user is in target user's friends list
      return Array.isArray(targetUser.friends) && targetUser.friends.includes(currentUser.uid);
  }
};

// Function to track user activity
export const trackUserActivity = () => {
  if (!currentUser || !db) return;

  // Clear existing timer
  if (userActivityTimer) {
    clearTimeout(userActivityTimer);
  }

  // Set user as active
  isUserActive = true;
  updateUserOnlineStatus(true);

  // Set timer to mark user as inactive after 30 seconds of inactivity
  userActivityTimer = setTimeout(() => {
    isUserActive = false;
    updateUserOnlineStatus(false);
  }, 30000); // 30 seconds
};

// Function to get current user - returns combined auth and Firestore data
export const getCurrentUser = () => {
  if (!currentUser) {
    return null;
  }
  
  // If we have Firestore data, combine it with auth data
  if (currentUserFirestoreData) {
    return {
      ...currentUser,
      ...currentUserFirestoreData
    };
  }
  
  // Otherwise return just the auth user
  return currentUser;
};

// Function to update user profile
export const updateUserProfile = async (displayName) => {
  if (currentUser) {
    // Update Firebase Authentication profile
    try {
      await updateProfile(currentUser, {
        displayName: displayName
      });
    } catch (error) {
      console.error('Profile update error:', error);
    }
    
    // Only interact with Firestore if it's available
    if (db) {
      try {
        // Update user document in Firestore
        await setDoc(doc(db, 'users', currentUser.uid), {
          uid: currentUser.uid,
          name: displayName,
          displayName: displayName,
          updatedAt: new Date()
        }, { merge: true });
      } catch (error) {
        console.error('Firestore error in updateUserProfile:', error);
      }
    }
    
    // Update local user object
    currentUser.displayName = displayName;
  }
};

// Add rate limiting variables at the top of the file
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_OPERATIONS_PER_WINDOW = 100; // Adjust based on your needs
let operationCount = 0;
let windowStartTime = Date.now();

// Helper function to check rate limit
const checkRateLimit = () => {
  const now = Date.now();
  
  // Reset window if it's been more than the window time
  if (now - windowStartTime > RATE_LIMIT_WINDOW) {
    operationCount = 0;
    windowStartTime = now;
  }
  
  // Check if we've exceeded the limit
  if (operationCount >= MAX_OPERATIONS_PER_WINDOW) {
    const timeLeft = RATE_LIMIT_WINDOW - (now - windowStartTime);
    console.warn(`Rate limit exceeded. Please wait ${Math.ceil(timeLeft / 1000)} seconds.`);
    return false;
  }
  
  // Increment operation count
  operationCount++;
  return true;
};

// Function to send a friend request with rate limiting
export const sendFriendRequest = async (friendEmail) => {
  // Check rate limit before proceeding
  if (!checkRateLimit()) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  if (!currentUser || !db) {
    throw new Error('User not authenticated or database not available');
  }

  try {
    // Find the user with the provided email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', friendEmail));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('User with this email not found');
    }
    
    const friendDoc = querySnapshot.docs[0];
    const friendData = friendDoc.data();
    
    // Add friend request to the recipient's friendRequests array
    await updateDoc(doc(db, 'users', friendData.uid), {
      friendRequests: arrayUnion({
        from: currentUser.uid,
        fromEmail: currentUser.email,
        fromName: currentUser.displayName,
        timestamp: new Date()
      })
    });
    
    // Add notification to the requester about sending the request
    const notificationData = {
      type: 'friend_request_sent',
      message: `You sent a friend request to ${friendData.name || friendData.displayName || friendData.email}`,
      to: friendData.uid,
      toName: friendData.name || friendData.displayName || friendData.email,
      timestamp: new Date(),
      read: false
    };
    
    // Get the current user's document first
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const notifications = Array.isArray(userData.notifications) ? userData.notifications : [];
      
      // Add the new notification to the array
      notifications.push(notificationData);
      
      // Update the document with the new notifications array
      // Ensure the read property is properly stored
      await updateDoc(userDocRef, {
        notifications: notifications.map(notification => ({
          ...notification,
          read: notification.read !== undefined ? notification.read : false
        }))
      });
    }
    
    return friendData;
  } catch (error) {
    console.error('Error sending friend request:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
      friendEmail: friendEmail,
      currentUser: currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName
      } : null
    });
    
    // Handle specific Firebase errors
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. You may not have access to send friend requests.');
    } else if (error.code === 'not-found') {
      throw new Error('User not found. Please check the email address.');
    } else if (error.code === 'resource-exhausted') {
      throw new Error('Too many requests. Please wait a moment and try again.');
    } else if (error.message === 'User with this email not found') {
      throw new Error('User with this email not found');
    } else {
      throw new Error('Failed to send friend request. Please try again.');
    }
  }
};

// Function to subscribe to friend requests
export const subscribeToFriendRequests = (callback) => {
  if (!currentUser || !db) {
    callback([]);
    return () => {};
  }

  try {
    // Get the current user's document to get their friend requests
    const userDocRef = doc(db, 'users', currentUser.uid);
    
    return onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        const friendRequests = userData.friendRequests || [];
        callback(friendRequests);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error('Friend requests subscription error:', error);
      callback([]);
    });
  } catch (error) {
    console.error('Friend requests subscription setup error:', error);
    callback([]);
    return () => {};
  }
};

// Function to accept a friend request with rate limiting
export const acceptFriendRequest = async (request) => {
  // Check rate limit before proceeding
  if (!checkRateLimit()) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  if (!currentUser || !db) {
    throw new Error('User not authenticated or database not available');
  }

  try {
    // Add the requester to the current user's friends list
    await updateDoc(doc(db, 'users', currentUser.uid), {
      friends: arrayUnion(request.from),
      friendRequests: arrayRemove(request)
    });

    // Add the current user to the requester's friends list
    await updateDoc(doc(db, 'users', request.from), {
      friends: arrayUnion(currentUser.uid)
    });
    
    // Add notification to the current user (Himani) about accepting the request
    const notificationData1 = {
      type: 'friend_request_accepted_self',
      message: `You accepted ${request.fromName || request.fromEmail}'s friend request`,
      from: request.from,
      fromName: request.fromName || request.fromEmail,
      timestamp: new Date(),
      read: false
    };
    
    // Get the current user's document first
    const currentUserDocRef = doc(db, 'users', currentUser.uid);
    const currentUserDoc = await getDoc(currentUserDocRef);
    
    if (currentUserDoc.exists()) {
      const userData = currentUserDoc.data();
      const notifications = Array.isArray(userData.notifications) ? userData.notifications : [];
      
      // Add the new notification to the array
      notifications.push(notificationData1);
      
      // Update the document with the new notifications array
      // Ensure the read property is properly stored
      await updateDoc(currentUserDocRef, {
        notifications: notifications.map(notification => ({
          ...notification,
          read: notification.read !== undefined ? notification.read : false
        }))
      });
    }
    
    // Add notification to the requester
    const notificationData2 = {
      type: 'friend_request_accepted',
      message: `${currentUser.displayName || currentUser.email} accepted your friend request`,
      from: currentUser.uid,
      fromName: currentUser.displayName || currentUser.email,
      timestamp: new Date(),
      read: false
    };
    
    // Get the requester's document first
    const requesterDocRef = doc(db, 'users', request.from);
    const requesterDoc = await getDoc(requesterDocRef);
    
    if (requesterDoc.exists()) {
      const userData = requesterDoc.data();
      const notifications = Array.isArray(userData.notifications) ? userData.notifications : [];
      
      // Add the new notification to the array
      notifications.push(notificationData2);
      
      // Update the document with the new notifications array
      // Ensure the read property is properly stored
      await updateDoc(requesterDocRef, {
        notifications: notifications.map(notification => ({
          ...notification,
          read: notification.read !== undefined ? notification.read : false
        }))
      });
    }

    return true;
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
};

// Function to decline a friend request with rate limiting
export const declineFriendRequest = async (request) => {
  // Check rate limit before proceeding
  if (!checkRateLimit()) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  if (!currentUser || !db) {
    throw new Error('User not authenticated or database not available');
  }

  try {
    // Remove the request from the current user's friendRequests array
    await updateDoc(doc(db, 'users', currentUser.uid), {
      friendRequests: arrayRemove(request)
    });
    
    // Add notification to the current user (Himani) about declining the request
    const notificationData1 = {
      type: 'friend_request_declined_self',
      message: `You declined ${request.fromName || request.fromEmail}'s friend request`,
      from: request.from,
      fromName: request.fromName || request.fromEmail,
      timestamp: new Date(),
      read: false
    };
    
    // Get the current user's document first
    const currentUserDocRef = doc(db, 'users', currentUser.uid);
    const currentUserDoc = await getDoc(currentUserDocRef);
    
    if (currentUserDoc.exists()) {
      const userData = currentUserDoc.data();
      const notifications = Array.isArray(userData.notifications) ? userData.notifications : [];
      
      // Add the new notification to the array
      notifications.push(notificationData1);
      
      // Update the document with the new notifications array
      await updateDoc(currentUserDocRef, {
        notifications: notifications
      });
    }
    
    // Add notification to the requester
    const notificationData2 = {
      type: 'friend_request_declined',
      message: `${currentUser.displayName || currentUser.email} declined your friend request`,
      from: currentUser.uid,
      fromName: currentUser.displayName || currentUser.email,
      timestamp: new Date(),
      read: false
    };
    
    // Get the requester's document first
    const requesterDocRef = doc(db, 'users', request.from);
    const requesterDoc = await getDoc(requesterDocRef);
    
    if (requesterDoc.exists()) {
      const userData = requesterDoc.data();
      const notifications = Array.isArray(userData.notifications) ? userData.notifications : [];
      
      // Add the new notification to the array
      notifications.push(notificationData2);
      
      // Update the document with the new notifications array
      await updateDoc(requesterDocRef, {
        notifications: notifications
      });
    }

    return true;
  } catch (error) {
    console.error('Error declining friend request:', error);
    throw error;
  }
};

// Function to unfriend a user with rate limiting
export const unfriendUser = async (friendUid) => {
  // Check rate limit before proceeding
  if (!checkRateLimit()) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  if (!currentUser || !db) {
    throw new Error('User not authenticated or database not available');
  }

  try {
    // Get friend's data for notification
    const friendDoc = await getDoc(doc(db, 'users', friendUid));
    const friendData = friendDoc.exists() ? friendDoc.data() : null;
    const friendName = friendData?.displayName || friendData?.name || friendData?.email || `User${friendUid.substring(0, 5)}`;

    // Remove the friend from the current user's friends list
    await updateDoc(doc(db, 'users', currentUser.uid), {
      friends: arrayRemove(friendUid)
    });

    // Remove the current user from the friend's friends list
    await updateDoc(doc(db, 'users', friendUid), {
      friends: arrayRemove(currentUser.uid)
    });
    
    // Add notification to the current user about unfriending
    const notificationData1 = {
      type: 'unfriended_user',
      message: `You unfriended ${friendName}`,
      friendUid: friendUid,
      friendName: friendName,
      timestamp: new Date(),
      read: false
    };
    
    // Get the current user's document first
    const currentUserDocRef = doc(db, 'users', currentUser.uid);
    const currentUserDoc = await getDoc(currentUserDocRef);
    
    if (currentUserDoc.exists()) {
      const userData = currentUserDoc.data();
      const notifications = Array.isArray(userData.notifications) ? userData.notifications : [];
      
      // Add the new notification to the array
      notifications.push(notificationData1);
      
      // Update the document with the new notifications array
      // Ensure the read property is properly stored
      await updateDoc(currentUserDocRef, {
        notifications: notifications.map(notification => ({
          ...notification,
          read: notification.read !== undefined ? notification.read : false
        }))
      });
    }

    // Add notification to the unfriended user
    const notificationData2 = {
      type: 'unfriended_by_user',
      message: `${currentUser.displayName || currentUser.email} unfriended you`,
      from: currentUser.uid,
      fromName: currentUser.displayName || currentUser.email,
      timestamp: new Date(),
      read: false
    };
    
    // Get the unfriended user's document first
    const unfriendedUserDocRef = doc(db, 'users', friendUid);
    const unfriendedUserDoc = await getDoc(unfriendedUserDocRef);
    
    if (unfriendedUserDoc.exists()) {
      const userData = unfriendedUserDoc.data();
      const notifications = Array.isArray(userData.notifications) ? userData.notifications : [];
      
      // Add the new notification to the array
      notifications.push(notificationData2);
      
      // Update the document with the new notifications array
      // Ensure the read property is properly stored
      await updateDoc(unfriendedUserDocRef, {
        notifications: notifications.map(notification => ({
          ...notification,
          read: notification.read !== undefined ? notification.read : false
        }))
      });
    }

    return true;
  } catch (error) {
    console.error('Error unfriending user:', error);
    throw error;
  }
};

// Function to subscribe to notifications with enhanced filtering
export const subscribeToNotifications = (callback) => {
  if (!currentUser || !db) {
    callback([]);
    return () => {};
  }

  try {
    // Get the current user's document to get their notifications
    const userDocRef = doc(db, 'users', currentUser.uid);
    
    return onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        const notifications = userData.notifications || [];
        
        // Enhanced filtering for valid, recent, unread call notifications
        const now = Date.now();
        const MAX_NOTIFICATION_AGE = 30 * 1000; // 30 seconds
        
        const validNotifications = notifications.filter(notif => {
          // For call notifications, apply special filtering
          if (notif.type === 'video_call' || notif.type === 'audio_call') {
            // Skip if already read
            if (notif.read) return false;
            
            // Check if status is ringing
            if (notif.status !== 'ringing') return false;
            
            // Check timestamp validity
            let timestampMs;
            try {
              if (notif.timestamp?.toDate) {
                timestampMs = notif.timestamp.toDate().getTime();
              } else if (typeof notif.timestamp === 'string') {
                timestampMs = new Date(notif.timestamp).getTime();
              } else if (notif.timestamp instanceof Date) {
                timestampMs = notif.timestamp.getTime();
              } else {
                return false; // Invalid timestamp format
              }
            } catch (e) {
              return false; // Error parsing timestamp
            }
            
            // Check if notification is too old
            if (now - timestampMs > MAX_NOTIFICATION_AGE) {
              return false;
            }
            
            // Check if callee is current user (for call notifications)
            if (notif.calleeUid && notif.calleeUid !== currentUser.uid) {
              return false;
            }
            
            return true;
          } else {
            // For non-call notifications, show all notifications but still apply basic filtering
            // Only filter out notifications that are too old or invalid
            try {
              let timestampMs;
              if (notif.timestamp?.toDate) {
                timestampMs = notif.timestamp.toDate().getTime();
              } else if (typeof notif.timestamp === 'string') {
                timestampMs = new Date(notif.timestamp).getTime();
              } else if (notif.timestamp instanceof Date) {
                timestampMs = notif.timestamp.getTime();
              } else {
                // If we can't parse the timestamp, show the notification
                return true;
              }
              
              // For non-call notifications, we don't filter by age unless it's extremely old
              // This ensures friend requests and other notifications are shown
              return true;
            } catch (e) {
              // If there's an error parsing timestamp, still show the notification
              return true;
            }
          }
        });
        
        // Sort notifications by timestamp (newest first)
        const sortedNotifications = validNotifications.sort((a, b) => {
          // Handle cases where timestamp might be a string or Date object
          try {
            const aTime = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 
                         typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() :
                         a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
                         
            const bTime = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 
                         typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() :
                         b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
                         
            return bTime - aTime;
          } catch (e) {
            // If there's an error sorting, maintain original order
            return 0;
          }
        });
        
        callback(sortedNotifications);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error('Notifications subscription error:', error);
      callback([]);
    });
  } catch (error) {
    console.error('Notifications subscription setup error:', error);
    callback([]);
    return () => {};
  }
};

// Function to mark a notification as read with improved handling
export const markNotificationAsRead = async (notification) => {
  if (!currentUser || !db) {
    throw new Error('User not authenticated or database not available');
  }

  try {
    // Get the current user's document
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const notifications = userData.notifications || [];
      
      // Find the notification to update by comparing relevant fields
      const updatedNotifications = notifications.map(notif => {
        // Create a more reliable comparison by converting timestamps to milliseconds
        let notifTimestampMs, targetTimestampMs;
        
        // Handle notification timestamp
        if (notif.timestamp?.toDate) {
          notifTimestampMs = notif.timestamp.toDate().getTime();
        } else if (typeof notif.timestamp === 'string') {
          notifTimestampMs = new Date(notif.timestamp).getTime();
        } else if (notif.timestamp instanceof Date) {
          notifTimestampMs = notif.timestamp.getTime();
        } else {
          notifTimestampMs = notif.timestamp;
        }
        
        // Handle target notification timestamp
        if (notification.timestamp?.toDate) {
          targetTimestampMs = notification.timestamp.toDate().getTime();
        } else if (typeof notification.timestamp === 'string') {
          targetTimestampMs = new Date(notification.timestamp).getTime();
        } else if (notification.timestamp instanceof Date) {
          targetTimestampMs = notification.timestamp.getTime();
        } else {
          targetTimestampMs = notification.timestamp;
        }
        
        // Compare notifications based on type, message, and timestamp
        if (notif.type === notification.type && 
            notif.message === notification.message &&
            notifTimestampMs === targetTimestampMs) {
          return { ...notif, read: true };
        }
        return notif;
      });
      
      // Update the document with the modified notifications array
      await updateDoc(userDocRef, {
        notifications: updatedNotifications
      });
    }

    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Function to clear all notifications
export const clearAllNotifications = async () => {
  if (!currentUser || !db) {
    throw new Error('User not authenticated or database not available');
  }

  try {
    // Clear all notifications
    await updateDoc(doc(db, 'users', currentUser.uid), {
      notifications: []
    });

    return true;
  } catch (error) {
    console.error('Error clearing notifications:', error);
    throw error;
  }
};

// Function to send a video call notification to a user with improved structure
export const sendVideoCallNotification = async (recipientUid, callerData, callId) => {
  if (!currentUser || !db) {
    throw new Error('User not authenticated or database not available');
  }

  try {
    // Create call notification
    const callNotification = {
      type: 'video_call',
      callerUid: currentUser.uid,
      callerName: currentUser.displayName || currentUser.email,
      callerPhotoURL: currentUser.photoURL,
      callId: callId || null,
      timestamp: new Date().toISOString(),
      status: 'ringing', // ringing, accepted, declined, missed
      read: false
    };

    // Get the recipient's document
    const recipientDocRef = doc(db, 'users', recipientUid);
    const recipientDoc = await getDoc(recipientDocRef);

    if (recipientDoc.exists()) {
      const userData = recipientDoc.data();
      const notifications = userData.notifications || [];

      // Add the new call notification to the array
      notifications.push(callNotification);

      // Update the document with the new notifications array
      await updateDoc(recipientDocRef, {
        notifications: notifications.map(notification => ({
          ...notification,
          read: notification.read !== undefined ? notification.read : false
        }))
      });

      return callNotification;
    } else {
      throw new Error('Recipient user not found');
    }
  } catch (error) {
    console.error('Error sending video call notification:', error);
    throw error;
  }
};

// Function to send an audio call notification to a user
export const sendAudioCallNotification = async (recipientUid, callerData, callId) => {
  if (!currentUser || !db) {
    throw new Error('User not authenticated or database not available');
  }

  try {
    // Create call notification
    const callNotification = {
      type: 'audio_call',
      callerUid: currentUser.uid,
      callerName: currentUser.displayName || currentUser.email,
      callerPhotoURL: currentUser.photoURL,
      callId: callId || null,
      timestamp: new Date().toISOString(),
      status: 'ringing', // ringing, accepted, declined, missed
      read: false
    };

    // Get the recipient's document
    const recipientDocRef = doc(db, 'users', recipientUid);
    const recipientDoc = await getDoc(recipientDocRef);

    if (recipientDoc.exists()) {
      const userData = recipientDoc.data();
      const notifications = userData.notifications || [];

      // Add the new call notification to the array
      notifications.push(callNotification);

      // Update the document with the new notifications array
      await updateDoc(recipientDocRef, {
        notifications: notifications
      });

      return callNotification;
    } else {
      throw new Error('Recipient user not found');
    }
  } catch (error) {
    console.error('Error sending audio call notification:', error);
    throw error;
  }
};

// Function to update call notification status
export const updateCallNotificationStatus = async (notificationId, status) => {
  if (!currentUser || !db) {
    throw new Error('User not authenticated or database not available');
  }

  try {
    // Get the current user's document
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const notifications = userData.notifications || [];

      // Find and update the notification
      const updatedNotifications = notifications.map((notif, index) => {
        if (index === notificationId) {
          return { ...notif, status: status, read: true };
        }
        return notif;
      });

      // Update the document with the modified notifications array
      // Ensure the read property is properly stored
      await updateDoc(userDocRef, {
        notifications: updatedNotifications.map(notification => ({
          ...notification,
          read: notification.read !== undefined ? notification.read : false
        }))
      });

      return true;
    }
  } catch (error) {
    console.error('Error updating call notification status:', error);
    throw error;
  }
};

// Function to subscribe to friends list only with enhanced security
export const subscribeToFriends = (callback) => {
  if (!currentUser || !db) {
    callback([])
    return () => {}
  }

  try {
    // Get the current user's document to get their friends list
    const userDocRef = doc(db, 'users', currentUser.uid)
    
    // Subscribe to the current user's document to get updated friends list
    const unsubscribeUserDoc = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data()
        const friendIds = Array.isArray(userData.friends) ? userData.friends : []
        
        // If no friends, return empty array
        if (friendIds.length === 0) {
          callback([])
          return
        }
        
        // Handle Firestore 'in' query limit of 10 items
        const chunks = []
        for (let i = 0; i < friendIds.length; i += 10) {
          chunks.push(friendIds.slice(i, i + 10))
        }
        
        // Create an array to hold all unsubscribe functions
        const unsubscribeFunctions = []
        // Create a map to store friends data from all chunks
        let allFriends = []
        let completedChunks = 0
        
        // Subscribe to friends' data with individual listeners for real-time updates
        const friendsRef = collection(db, 'users')
        
        // Process each chunk
        chunks.forEach(chunk => {
          const q = query(friendsRef, where('uid', 'in', chunk))
          
          const unsubscribeFriends = onSnapshot(q, (querySnapshot) => {
            const friends = []
            querySnapshot.forEach((doc) => {
              const friendData = doc.data()
              // Ensure we're using high quality images
              if (friendData.photoURL) {
                friendData.photoURL = getHighQualityPhotoURL(friendData.photoURL)
              }
              friends.push({ id: doc.id, ...friendData })
            })
            
            // Merge friends from this chunk with existing friends
            allFriends = [...allFriends.filter(f => !friends.some(newF => newF.uid === f.uid)), ...friends]
            completedChunks++
            
            // Only call callback when all chunks have been processed
            if (completedChunks === chunks.length) {
              callback(allFriends)
            }
          }, (error) => {
            console.error('Friends subscription error:', error)
            callback([])
          })
          
          unsubscribeFunctions.push(unsubscribeFriends)
        })
        
        // Return a function that unsubscribes from all listeners
        return () => {
          unsubscribeFunctions.forEach(unsub => unsub())
        }
      } else {
        callback([])
        return () => {}
      }
    }, (error) => {
      console.error('User document subscription error:', error)
      callback([])
      return () => {}
    })
    
    return unsubscribeUserDoc
  } catch (error) {
    console.error('Friends subscription setup error:', error)
    callback([])
    return () => {}
  }
}

// Function to search friends with enhanced security and performance
export const searchFriends = async (searchQuery) => {
  if (!currentUser || !db || !searchQuery.trim()) {
    return []
  }

  try {
    // Get current user's friends list
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
    
    if (!userDoc.exists()) {
      return []
    }
    
    const userData = userDoc.data()
    const friendIds = Array.isArray(userData.friends) ? userData.friends : []
    
    if (friendIds.length === 0) {
      return []
    }
    
    // Handle Firestore 'in' query limit of 10 items
    const chunks = []
    for (let i = 0; i < friendIds.length; i += 10) {
      chunks.push(friendIds.slice(i, i + 10))
    }
    
    // Search for friends matching the query
    const searchResults = []
    const searchTerm = searchQuery.toLowerCase().trim()
    
    for (const chunk of chunks) {
      const friendsRef = collection(db, 'users')
      const q = query(friendsRef, where('uid', 'in', chunk))
      
      const querySnapshot = await getDocs(q)
      querySnapshot.forEach((doc) => {
        const friendData = doc.data()
        
        // Check if friend matches search query
        const name = friendData.name || friendData.displayName || ''
        const email = friendData.email || ''
        
        if (name.toLowerCase().includes(searchTerm) || email.toLowerCase().includes(searchTerm)) {
          // Ensure we're using high quality images
          if (friendData.photoURL) {
            friendData.photoURL = getHighQualityPhotoURL(friendData.photoURL)
          }
          searchResults.push({ id: doc.id, ...friendData })
        }
      })
    }
    
    return searchResults
  } catch (error) {
    console.error('Error searching friends:', error)
    return []
  }
}

/**
 * Function to search all users by name or email (not just friends)
 * @param {string} searchQuery - The search term to match against user names or emails
 * @returns {Promise<Array>} - Array of user objects matching the search query
 */
export const searchAllUsers = async (searchQuery) => {
  if (!currentUser || !db || !searchQuery.trim()) {
    return []
  }

  try {
    const usersRef = collection(db, 'users')
    const querySnapshot = await getDocs(usersRef)
    
    const searchResults = []
    const searchTerm = searchQuery.toLowerCase().trim()
    
    querySnapshot.forEach((doc) => {
      // Skip the current user
      if (doc.id === currentUser.uid) {
        return
      }
      
      const userData = doc.data()
      
      // Check if user matches search query
      const name = userData.name || userData.displayName || ''
      const email = userData.email || ''
      
      if (name.toLowerCase().includes(searchTerm) || email.toLowerCase().includes(searchTerm)) {
        // Ensure we're using high quality images
        if (userData.photoURL) {
          userData.photoURL = getHighQualityPhotoURL(userData.photoURL)
        }
        searchResults.push({ id: doc.id, ...userData })
      }
    })
    
    return searchResults
  } catch (error) {
    console.error('Error searching all users:', error)
    return []
  }
}

// Function to subscribe to users list (all users for demo purposes)
export const subscribeToUsers = (callback) => {
  // Only subscribe to Firestore if it's available
  if (db) {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      
      return onSnapshot(q, (querySnapshot) => {
        const users = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          // Ensure we're using high quality images
          if (userData.photoURL) {
            userData.photoURL = getHighQualityPhotoURL(userData.photoURL);
          }
          users.push({ id: doc.id, ...userData });
        });
        
        callback(users);
      }, (error) => {
        console.error('Firestore subscription error:', error);
        // Return empty array on error but don't break the app
        callback([]); // Return empty array on error
      });
    } catch (error) {
      console.error('Firestore subscription setup error:', error);
      callback([]); // Return empty array on error
      return () => {}; // Return empty unsubscribe function
    }
  } else {
    console.warn('Firestore not available, returning empty user list');
    callback([]); // Return empty array if Firestore is not available
    return () => {}; // Return empty unsubscribe function
  }
};

// Function to check if a user is a friend
export const isUserFriend = async (friendUid) => {
  if (!currentUser || !db) {
    return false;
  }

  try {
    // Get the current user's document to check their friends list
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const friends = Array.isArray(userData.friends) ? userData.friends : [];
      return friends.includes(friendUid);
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if user is friend:', error);
    return false;
  }
};

// Function to get user by ID
export const getUserById = async (uid) => {
  // Only interact with Firestore if it's available
  if (db) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Ensure we're using high quality images
        if (userData.photoURL) {
          userData.photoURL = getHighQualityPhotoURL(userData.photoURL);
        }
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Firestore error in getUserById:', error);
      return null;
    }
  } else {
    console.warn('Firestore not available, returning null');
    return null;
  }
};