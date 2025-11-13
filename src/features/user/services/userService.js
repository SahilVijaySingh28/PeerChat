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
  addDoc,
  Timestamp
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
let onlineStatusUpdateInProgress = false; // Track if an online status update is in progress
let onlineStatusUpdateQueue = null; // Queue for pending online status updates
let onlineStatusDebounceTimer = null; // Debounce timer for online status updates

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
                displayName: user.displayName || '',
                email: user.email ? user.email.toLowerCase().trim() : '', // Normalize email to lowercase
                photoURL: getHighQualityPhotoURL(user.photoURL) || user.photoURL || '', // Keep original if processing fails
                friends: [], // Initialize empty friends array
                friendRequests: [], // Initialize empty friend requests array
                notifications: [], // Initialize empty notifications array
                createdAt: Timestamp.fromDate(new Date()),
                // Online status privacy settings
                onlineStatusPrivacy: 'friends', // 'everyone', 'friends', 'nobody'
                isOnline: true, // Set as online when creating account
                lastSeen: Timestamp.fromDate(new Date()),
                appearOffline: false // Default to not appearing offline
              };
              
              await setDoc(doc(db, 'users', user.uid), userData);
              currentUserFirestoreData = userData;
              console.log('initAuth: Created new user document in Firestore:', user.uid);
              
              // Ensure online status is set after document creation (immediate update)
              try {
                await updateUserOnlineStatus(true, true);
              } catch (statusError) {
                console.warn('Error setting online status after user creation:', statusError);
              }
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
              
              // Normalize email to lowercase for consistency
              const normalizedEmail = user.email ? user.email.toLowerCase().trim() : (userData.email || '');
              
              // Update Firestore with latest auth data
              const updatedData = {
                uid: user.uid,
                name: user.displayName || user.email || userData.name || `User${Math.floor(Math.random() * 10000)}`,
                displayName: user.displayName || userData.displayName || '',
                email: normalizedEmail, // Use normalized email
                photoURL: getHighQualityPhotoURL(user.photoURL) || user.photoURL || userData.photoURL || '',
                friends: userData.friends, // Preserve existing friends array
                friendRequests: userData.friendRequests, // Preserve existing friendRequests array
                notifications: userData.notifications, // Preserve existing notifications array
                lastLogin: Timestamp.fromDate(new Date()),
                appearOffline: userData.appearOffline !== undefined ? userData.appearOffline : false
              };
              
              await setDoc(doc(db, 'users', user.uid), updatedData, { merge: true });
              console.log('initAuth: Updated existing user document in Firestore:', user.uid);
              
              // Set user as online when they sign in, unless they've chosen to appear offline (immediate update)
              if (!userData.appearOffline) {
                await updateUserOnlineStatus(true, true);
              } else {
                // Ensure they're marked as offline if they've chosen to appear offline
                await updateUserOnlineStatus(false, true);
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
        // Check if user document already exists
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        // Prepare user data with all required fields
        const baseUserData = {
          uid: currentUser.uid,
          name: currentUser.displayName || currentUser.email || `User${currentUser.uid.substring(0, 5)}`,
          displayName: currentUser.displayName || '',
          email: currentUser.email ? currentUser.email.toLowerCase().trim() : '', // Normalize email
          photoURL: getHighQualityPhotoURL(currentUser.photoURL) || currentUser.photoURL || '',
          lastLogin: Timestamp.fromDate(new Date()),
          appearOffline: false
        };
        
        if (!userDoc.exists()) {
          // Create new user document with all required fields
          const newUserData = {
            ...baseUserData,
            friends: [], // Initialize empty friends array
            friendRequests: [], // Initialize empty friend requests array
            notifications: [], // Initialize empty notifications array
            createdAt: Timestamp.fromDate(new Date()),
            onlineStatusPrivacy: 'friends', // 'everyone', 'friends', 'nobody'
            isOnline: true,
            lastSeen: Timestamp.fromDate(new Date())
          };
          
          await setDoc(userDocRef, newUserData);
          currentUserFirestoreData = newUserData;
          console.log('signInWithGoogle: Created new user document in Firestore:', currentUser.uid);
          
          // Ensure online status is set after document creation (immediate update)
          try {
            await updateUserOnlineStatus(true, true);
          } catch (statusError) {
            console.warn('Error setting online status after user creation:', statusError);
          }
        } else {
          // Update existing user document, ensuring arrays exist
          const existingData = userDoc.data();
          const updatedUserData = {
            ...baseUserData,
            // Preserve existing arrays if they exist, otherwise initialize them
            friends: Array.isArray(existingData.friends) ? existingData.friends : [],
            friendRequests: Array.isArray(existingData.friendRequests) ? existingData.friendRequests : [],
            notifications: Array.isArray(existingData.notifications) ? existingData.notifications : [],
            // Preserve other existing fields
            createdAt: existingData.createdAt || new Date(),
            onlineStatusPrivacy: existingData.onlineStatusPrivacy || 'friends',
            lastSeen: existingData.lastSeen || new Date(),
            appearOffline: existingData.appearOffline !== undefined ? existingData.appearOffline : false
          };
          
          await setDoc(userDocRef, updatedUserData, { merge: true });
          currentUserFirestoreData = updatedUserData;
          console.log('signInWithGoogle: Updated existing user document in Firestore:', currentUser.uid);
        }
        
        // Set user as online when they sign in, unless they've chosen to appear offline (immediate update)
        const finalUserData = currentUserFirestoreData || baseUserData;
        if (!finalUserData.appearOffline) {
          await updateUserOnlineStatus(true, true);
        } else {
          // Ensure they're marked as offline if they've chosen to appear offline
          await updateUserOnlineStatus(false, true);
        }
      } catch (error) {
        console.error('Error creating/updating user document:', error);
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
    // Set user as offline before signing out (immediate update)
    await updateUserOnlineStatus(false, true);
    
    await signOut(auth);
    currentUser = null;
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// Function to update user's online status with debouncing and queue management
export const updateUserOnlineStatus = async (isOnline, immediate = false) => {
  // Use auth.currentUser to ensure we have the latest authenticated user
  const authUser = auth.currentUser;
  if (!authUser || !db) {
    console.warn('updateUserOnlineStatus: No authenticated user or database not available');
    return;
  }

  // If an update is already in progress, queue this update
  if (onlineStatusUpdateInProgress && !immediate) {
    onlineStatusUpdateQueue = isOnline;
    return;
  }

  // Debounce non-immediate updates to avoid too many writes
  if (!immediate) {
    // Clear existing debounce timer
    if (onlineStatusDebounceTimer) {
      clearTimeout(onlineStatusDebounceTimer);
    }
    
    // Set new debounce timer
    onlineStatusDebounceTimer = setTimeout(async () => {
      await performOnlineStatusUpdate(authUser, isOnline);
    }, 1000); // Wait 1 second before updating
    
    return;
  }

  // Immediate update (for sign in/out)
  await performOnlineStatusUpdate(authUser, isOnline);
};

// Internal function to perform the actual Firestore update
const performOnlineStatusUpdate = async (authUser, isOnline) => {
  // Prevent concurrent updates
  if (onlineStatusUpdateInProgress) {
    console.warn('updateUserOnlineStatus: Update already in progress, skipping');
    return;
  }

  onlineStatusUpdateInProgress = true;
  
  // Define userDocRef outside try block so it's accessible in catch
  const userDocRef = doc(db, 'users', authUser.uid);

  try {
    // Use Timestamp instead of serverTimestamp() to avoid Firestore internal assertion errors
    const updateData = {
      isOnline: isOnline,
      lastSeen: Timestamp.fromDate(new Date())
    };
    
    await updateDoc(userDocRef, updateData);
    console.log(`updateUserOnlineStatus: Set user ${authUser.uid} online status to ${isOnline}`);
    
    // Process queued update if any
    if (onlineStatusUpdateQueue !== null) {
      const queuedStatus = onlineStatusUpdateQueue;
      onlineStatusUpdateQueue = null;
      // Recursively call with immediate flag to process queue
      setTimeout(() => {
        performOnlineStatusUpdate(authUser, queuedStatus);
      }, 500);
    }
  } catch (error) {
    console.error('Error updating user online status:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    // If the document doesn't exist or permission denied, create it
    if (error.code === 'not-found' || error.code === 'permission-denied') {
      try {
        const userData = {
          uid: authUser.uid,
          name: authUser.displayName || authUser.email || `User${authUser.uid.substring(0, 5)}`,
          displayName: authUser.displayName || '',
          email: authUser.email ? authUser.email.toLowerCase().trim() : '',
          photoURL: getHighQualityPhotoURL(authUser.photoURL) || authUser.photoURL || '',
          friends: [],
          friendRequests: [],
          notifications: [],
          createdAt: Timestamp.fromDate(new Date()),
          onlineStatusPrivacy: 'friends',
          isOnline: isOnline,
          lastSeen: Timestamp.fromDate(new Date()),
          appearOffline: false,
          lastLogin: Timestamp.fromDate(new Date())
        };
        await setDoc(userDocRef, userData);
        console.log('updateUserOnlineStatus: Created user document');
      } catch (createError) {
        console.error('Error creating user document in updateUserOnlineStatus:', createError);
        console.error('Create error details:', {
          code: createError.code,
          message: createError.message
        });
      }
    }
  } finally {
    onlineStatusUpdateInProgress = false;
  }
};

// Function to set user to appear offline
export const setAppearOffline = async (appearOffline) => {
  // Use auth.currentUser as fallback if currentUser is not set
  const authUser = auth.currentUser;
  const user = currentUser || authUser;
  
  if (!user || !db) {
    console.warn('setAppearOffline: No authenticated user or database not available');
    return;
  }

  try {
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      appearOffline: appearOffline
    });
  } catch (error) {
    console.error('Error updating appear offline status:', error);
  }
};

// Function to update user's online status privacy settings
export const updateUserOnlineStatusPrivacy = async (privacySetting) => {
  // Use auth.currentUser as fallback if currentUser is not set
  const authUser = auth.currentUser;
  const user = currentUser || authUser;
  
  if (!user || !db) {
    console.warn('updateUserOnlineStatusPrivacy: No authenticated user or database not available');
    return;
  }

  try {
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      onlineStatusPrivacy: privacySetting
    });
  } catch (error) {
    console.error('Error updating user online status privacy:', error);
  }
};

// Function to check if current user can see another user's online status
export const canSeeOnlineStatus = (targetUser) => {
  // Use auth.currentUser as fallback if currentUser is not set
  const authUser = auth.currentUser;
  const user = currentUser || authUser;
  
  if (!user || !targetUser) return false;
  
  // Always can see own status
  if (user.uid === targetUser.uid) return true;
  
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
      return Array.isArray(targetUser.friends) && targetUser.friends.includes(user.uid);
  }
};

// Function to track user activity with debouncing
export const trackUserActivity = () => {
  // Use auth.currentUser as fallback
  const authUser = auth.currentUser;
  if (!authUser || !db) return;

  // Clear existing timer
  if (userActivityTimer) {
    clearTimeout(userActivityTimer);
  }

  // Set user as active
  isUserActive = true;
  
  // Don't update immediately - let the debounce handle it
  // This prevents too many Firestore writes
  updateUserOnlineStatus(true, false).catch(err => {
    // Silently handle errors to avoid console spam
    if (err.code !== 'permission-denied') {
      console.warn('trackUserActivity: Error updating online status:', err.message);
    }
  });

  // Set timer to mark user as inactive after 30 seconds of inactivity
  userActivityTimer = setTimeout(() => {
    isUserActive = false;
    // Use immediate flag for offline status to ensure it's set
    updateUserOnlineStatus(false, true).catch(err => {
      console.warn('trackUserActivity: Error updating offline status:', err);
    });
    userActivityTimer = null;
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
  
  // Use auth.currentUser to ensure we have the latest authenticated user
  const authUser = auth.currentUser;
  if (!authUser || !db) {
    console.error('sendFriendRequest: User not authenticated or database not available', {
      hasAuthUser: !!authUser,
      hasDb: !!db,
      authUserUid: authUser?.uid
    });
    throw new Error('User not authenticated or database not available. Please log in and try again.');
  }

  try {
    // Ensure current user's document exists in Firestore
    const userDocRef = doc(db, 'users', authUser.uid);
    let userDoc = await getDoc(userDocRef);
    
    // If user document doesn't exist, create it
    if (!userDoc.exists()) {
      console.log('sendFriendRequest: User document does not exist, creating it...');
      const newUserData = {
        uid: authUser.uid,
        name: authUser.displayName || authUser.email || `User${authUser.uid.substring(0, 5)}`,
        displayName: authUser.displayName || '',
        email: authUser.email ? authUser.email.toLowerCase().trim() : '',
        photoURL: getHighQualityPhotoURL(authUser.photoURL) || authUser.photoURL || '',
        friends: [],
        friendRequests: [],
        notifications: [],
        createdAt: Timestamp.fromDate(new Date()),
        onlineStatusPrivacy: 'friends',
        isOnline: true,
        lastSeen: Timestamp.fromDate(new Date()),
        appearOffline: false,
        lastLogin: Timestamp.fromDate(new Date())
      };
      
      await setDoc(userDocRef, newUserData);
      userDoc = await getDoc(userDocRef); // Re-fetch the document
      
      if (!userDoc.exists()) {
        throw new Error('Failed to create user document. Please try logging in again.');
      }
    }
    
    // Normalize email to lowercase for case-insensitive comparison
    const normalizedFriendEmail = friendEmail.toLowerCase().trim();
    
    // Prevent users from adding themselves
    if (authUser.email && authUser.email.toLowerCase() === normalizedFriendEmail) {
      throw new Error('You cannot add yourself as a friend');
    }
    
    // Find the user with the provided email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', normalizedFriendEmail));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('User with this email not found');
    }
    
    const friendDoc = querySnapshot.docs[0];
    const friendData = friendDoc.data();
    const friendUid = friendData.uid || friendDoc.id;
    
    // Validate friend data
    if (!friendUid) {
      throw new Error('Invalid user data. User UID not found.');
    }
    
    const userData = userDoc.data();
    const userFriends = Array.isArray(userData.friends) ? userData.friends : [];
    const userFriendRequests = Array.isArray(userData.friendRequests) ? userData.friendRequests : [];
    
    // Check if users are already friends
    if (userFriends.includes(friendUid)) {
      throw new Error('You are already friends with this user');
    }
    
    // Check if a friend request already exists (either sent or received)
    const existingRequest = userFriendRequests.find(req => 
      (req.from === friendUid || req.to === friendUid) ||
      (req.fromEmail && req.fromEmail.toLowerCase() === normalizedFriendEmail) ||
      (req.toEmail && req.toEmail.toLowerCase() === normalizedFriendEmail)
    );
    
    if (existingRequest) {
      throw new Error('A friend request already exists with this user');
    }
    
    // Get friend's document to check their friend requests
    const friendDocRef = doc(db, 'users', friendUid);
    const friendDocSnapshot = await getDoc(friendDocRef);
    
    if (!friendDocSnapshot.exists()) {
      throw new Error('User account not found. Please check the email address.');
    }
    
    const friendDocData = friendDocSnapshot.data();
    const friendFriendRequests = Array.isArray(friendDocData.friendRequests) ? friendDocData.friendRequests : [];
    const friendFriends = Array.isArray(friendDocData.friends) ? friendDocData.friends : [];
    
    // Check if friend already has a request from this user
    const existingFriendRequest = friendFriendRequests.find(req => 
      req.from === authUser.uid || 
      (req.fromEmail && req.fromEmail.toLowerCase() === authUser.email?.toLowerCase())
    );
    
    if (existingFriendRequest) {
      throw new Error('You have already sent a friend request to this user');
    }
    
    // Check if friend already has current user as a friend
    if (friendFriends.includes(authUser.uid)) {
      throw new Error('You are already friends with this user');
    }
    
    // Create friend request object with Firestore-compatible timestamp
    // Use Timestamp.fromDate() to ensure compatibility with Firestore arrayUnion
    const friendRequest = {
      from: authUser.uid,
      fromEmail: authUser.email || '',
      fromName: authUser.displayName || authUser.email || 'Unknown User',
      timestamp: Timestamp.fromDate(new Date()) // Convert to Firestore Timestamp
    };
    
    // Add friend request to the recipient's friendRequests array
    try {
      await updateDoc(friendDocRef, {
        friendRequests: arrayUnion(friendRequest)
      });
    } catch (updateError) {
      console.error('Error updating friend document:', updateError);
      // If the error is permission-denied, provide more context
      if (updateError.code === 'permission-denied') {
        throw new Error('Permission denied. Please ensure you are logged in and your account is properly set up. If the problem persists, try logging out and logging back in.');
      }
      throw updateError;
    }
    
    // Add notification to the requester about sending the request
    // Use Timestamp for consistency with Firestore
    const notificationData = {
      type: 'friend_request_sent',
      message: `You sent a friend request to ${friendData.name || friendData.displayName || friendData.email}`,
      to: friendUid,
      toName: friendData.name || friendData.displayName || friendData.email,
      timestamp: Timestamp.fromDate(new Date()),
      read: false
    };
    
    // Get the current user's notifications
    const notifications = Array.isArray(userData.notifications) ? userData.notifications : [];
    
    // Add the new notification to the array
    notifications.push(notificationData);
    
    // Update the document with the new notifications array
    try {
      await updateDoc(userDocRef, {
        notifications: notifications.map(notification => ({
          ...notification,
          read: notification.read !== undefined ? notification.read : false
        }))
      });
    } catch (updateError) {
      console.error('Error updating user notifications:', updateError);
      // Don't fail the entire operation if notification update fails
      // The friend request was already sent successfully
    }
    
    return friendData;
  } catch (error) {
    console.error('Error sending friend request:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
      friendEmail: friendEmail,
      authUser: authUser ? {
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName
      } : null
    });
    
    // Handle specific Firebase errors
    if (error.code === 'permission-denied') {
      // More detailed error message for permission issues
      console.error('Permission denied error details:', {
        code: error.code,
        message: error.message,
        authUser: authUser ? {
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName
        } : null,
        friendEmail: friendEmail
      });
      throw new Error('Permission denied. Please ensure you are logged in and try again. If the problem persists, try logging out and logging back in.');
    } else if (error.code === 'not-found') {
      throw new Error('User not found. Please check the email address.');
    } else if (error.code === 'resource-exhausted') {
      throw new Error('Too many requests. Please wait a moment and try again.');
    } else if (error.code === 'unavailable') {
      throw new Error('Service temporarily unavailable. Please check your internet connection and try again.');
    } else if (error.message === 'User with this email not found' || error.message.includes('not found')) {
      throw new Error('User with this email not found');
    } else if (error.message.includes('already')) {
      // Pass through messages about existing relationships
      throw error;
    } else {
      throw new Error(error.message || 'Failed to send friend request. Please try again.');
    }
  }
};

// Function to subscribe to friend requests
export const subscribeToFriendRequests = (callback) => {
  // Use auth.currentUser as fallback if currentUser is not set
  const authUser = auth.currentUser;
  const user = currentUser || authUser;
  
  if (!user || !db) {
    callback([]);
    return () => {};
  }

  try {
    // Get the current user's document to get their friend requests
    const userDocRef = doc(db, 'users', user.uid);
    
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
  
  // Use auth.currentUser as fallback if currentUser is not set
  const authUser = auth.currentUser;
  const user = currentUser || authUser;
  
  if (!user || !db) {
    console.error('acceptFriendRequest: User not authenticated or database not available', {
      hasCurrentUser: !!currentUser,
      hasAuthUser: !!authUser
    });
    throw new Error('User not authenticated or database not available. Please log in and try again.');
  }

  try {
    // Add the requester to the current user's friends list
    await updateDoc(doc(db, 'users', user.uid), {
      friends: arrayUnion(request.from),
      friendRequests: arrayRemove(request)
    });

    // Add the current user to the requester's friends list
    await updateDoc(doc(db, 'users', request.from), {
      friends: arrayUnion(user.uid)
    });
    
    // Add notification to the current user (Himani) about accepting the request
    const notificationData1 = {
      type: 'friend_request_accepted_self',
      message: `You accepted ${request.fromName || request.fromEmail}'s friend request`,
      from: request.from,
      fromName: request.fromName || request.fromEmail,
      timestamp: Timestamp.fromDate(new Date()),
      read: false
    };
    
    // Get the current user's document first
    const currentUserDocRef = doc(db, 'users', user.uid);
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
      message: `${user.displayName || user.email} accepted your friend request`,
      from: user.uid,
      fromName: user.displayName || user.email,
      timestamp: Timestamp.fromDate(new Date()),
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
  
  // Use auth.currentUser as fallback if currentUser is not set
  const authUser = auth.currentUser;
  const user = currentUser || authUser;
  
  if (!user || !db) {
    console.error('declineFriendRequest: User not authenticated or database not available', {
      hasCurrentUser: !!currentUser,
      hasAuthUser: !!authUser
    });
    throw new Error('User not authenticated or database not available. Please log in and try again.');
  }

  try {
    // Remove the request from the current user's friendRequests array
    await updateDoc(doc(db, 'users', user.uid), {
      friendRequests: arrayRemove(request)
    });
    
    // Add notification to the current user (Himani) about declining the request
    const notificationData1 = {
      type: 'friend_request_declined_self',
      message: `You declined ${request.fromName || request.fromEmail}'s friend request`,
      from: request.from,
      fromName: request.fromName || request.fromEmail,
      timestamp: Timestamp.fromDate(new Date()),
      read: false
    };
    
    // Get the current user's document first
    const currentUserDocRef = doc(db, 'users', user.uid);
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
      message: `${user.displayName || user.email} declined your friend request`,
      from: user.uid,
      fromName: user.displayName || user.email,
      timestamp: Timestamp.fromDate(new Date()),
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
  // Use auth.currentUser as fallback if currentUser is not set
  const authUser = auth.currentUser;
  const user = currentUser || authUser;
  
  if (!user || !db) {
    callback([]);
    return () => {};
  }

  try {
    // Get the current user's document to get their notifications
    const userDocRef = doc(db, 'users', user.uid);
    
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
  // Use auth.currentUser as fallback if currentUser is not set
  const authUser = auth.currentUser;
  const user = currentUser || authUser;
  
  if (!user || !db) {
    console.error('markNotificationAsRead: User not authenticated or database not available', {
      hasCurrentUser: !!currentUser,
      hasAuthUser: !!authUser
    });
    throw new Error('User not authenticated or database not available. Please log in and try again.');
  }

  try {
    // Get the current user's document
    const userDocRef = doc(db, 'users', user.uid);
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
  // Use auth.currentUser to ensure we have the latest authenticated user
  const authUser = auth.currentUser;
  if (!authUser || !db || !searchQuery || !searchQuery.trim()) {
    return []
  }

  try {
    // Get current user's friends list
    const userDoc = await getDoc(doc(db, 'users', authUser.uid))
    
    if (!userDoc.exists()) {
      console.warn('searchFriends: User document not found', { uid: authUser.uid });
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
        const email = (friendData.email || '').toLowerCase()
        const normalizedName = name.toLowerCase()
        
        if (normalizedName.includes(searchTerm) || email.includes(searchTerm)) {
          // Ensure we're using high quality images
          if (friendData.photoURL) {
            friendData.photoURL = getHighQualityPhotoURL(friendData.photoURL)
          }
          
          // Ensure uid is set
          if (!friendData.uid) {
            friendData.uid = doc.id;
          }
          
          searchResults.push({ 
            id: doc.id, 
            uid: friendData.uid,
            ...friendData 
          })
        }
      })
    }
    
    return searchResults
  } catch (error) {
    console.error('Error searching friends:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      searchQuery: searchQuery,
      authUser: authUser ? {
        uid: authUser.uid,
        email: authUser.email
      } : null
    })
    return []
  }
}

/**
 * Function to search all users by name or email (not just friends)
 * @param {string} searchQuery - The search term to match against user names or emails
 * @returns {Promise<Array>} - Array of user objects matching the search query
 */
export const searchAllUsers = async (searchQuery) => {
  // Use auth.currentUser to ensure we have the latest authenticated user
  const authUser = auth.currentUser;
  if (!authUser || !db || !searchQuery || !searchQuery.trim()) {
    console.warn('searchAllUsers: Missing auth user, db, or search query', {
      hasAuthUser: !!authUser,
      hasDb: !!db,
      searchQuery: searchQuery
    });
    return []
  }

  try {
    const usersRef = collection(db, 'users')
    const querySnapshot = await getDocs(usersRef)
    
    const searchResults = []
    const searchTerm = searchQuery.toLowerCase().trim()
    const currentUserId = authUser.uid
    
    querySnapshot.forEach((doc) => {
      // Skip the current user
      const docId = doc.id;
      const userData = doc.data();
      const userUid = userData.uid || docId;
      
      if (userUid === currentUserId || docId === currentUserId) {
        return
      }
      
      // Check if user matches search query
      const name = userData.name || userData.displayName || ''
      const email = (userData.email || '').toLowerCase()
      const normalizedName = name.toLowerCase()
      
      // Check if search term matches name or email
      if (normalizedName.includes(searchTerm) || email.includes(searchTerm)) {
        // Ensure we're using high quality images
        if (userData.photoURL) {
          userData.photoURL = getHighQualityPhotoURL(userData.photoURL)
        }
        
        // Ensure uid is set
        if (!userData.uid) {
          userData.uid = docId;
        }
        
        searchResults.push({ 
          id: docId, 
          uid: userData.uid,
          ...userData 
        })
      }
    })
    
    console.log(`searchAllUsers: Found ${searchResults.length} users matching "${searchQuery}"`);
    return searchResults
  } catch (error) {
    console.error('Error searching all users:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
      searchQuery: searchQuery,
      authUser: authUser ? {
        uid: authUser.uid,
        email: authUser.email
      } : null
    })
    
    // Return empty array on error to prevent breaking the UI
    return []
  }
}

// Function to subscribe to users list (all users - accessible to all logged-in users)
export const subscribeToUsers = (callback) => {
  console.log('subscribeToUsers: Setting up subscription...');
  
  // Check if user is authenticated
  const authUser = auth.currentUser;
  if (!authUser) {
    console.warn('subscribeToUsers: User not authenticated, returning empty user list');
    callback([]);
    return () => {};
  }
  
  // Only subscribe to Firestore if it's available
  if (!db) {
    console.warn('subscribeToUsers: Firestore not available, returning empty user list');
    callback([]); // Return empty array if Firestore is not available
    return () => {}; // Return empty unsubscribe function
  }
  
  try {
    const usersRef = collection(db, 'users');
    // Query all users - no filter, so all logged-in users can see all members
    const q = query(usersRef);
    
    console.log('subscribeToUsers: Creating Firestore snapshot listener for authenticated user:', authUser.uid);
    
    const unsubscribe = onSnapshot(
      q, 
      (querySnapshot) => {
        try {
          console.log(`subscribeToUsers: Snapshot received with ${querySnapshot.size} documents`);
          const users = [];
          
          querySnapshot.forEach((doc) => {
            try {
              const userData = doc.data();
              const docId = doc.id;
              
              // Skip if no user data
              if (!userData) {
                console.warn(`subscribeToUsers: Skipping document ${docId} - no data`);
                return;
              }
              
              // Create a new object instead of modifying the original Firestore data
              // This prevents Firestore internal assertion errors
              const processedUser = {
                id: docId,
                uid: userData.uid || docId,
                name: userData.name || userData.displayName || userData.email || `User${docId.substring(0, 5)}`,
                displayName: userData.displayName || userData.name || userData.email || '',
                email: (userData.email && typeof userData.email === 'string') 
                  ? userData.email.toLowerCase().trim() 
                  : (userData.email || ''),
                photoURL: userData.photoURL ? getHighQualityPhotoURL(userData.photoURL) : (userData.photoURL || ''),
                friends: Array.isArray(userData.friends) ? userData.friends : [],
                friendRequests: Array.isArray(userData.friendRequests) ? userData.friendRequests : [],
                notifications: Array.isArray(userData.notifications) ? userData.notifications : [],
                isOnline: userData.isOnline !== undefined ? userData.isOnline : false,
                lastSeen: userData.lastSeen || null,
                onlineStatusPrivacy: userData.onlineStatusPrivacy || 'friends',
                appearOffline: userData.appearOffline !== undefined ? userData.appearOffline : false,
                createdAt: userData.createdAt || null,
                lastLogin: userData.lastLogin || null
              };
              
              users.push(processedUser);
            } catch (docError) {
              console.error('subscribeToUsers: Error processing user document:', docError, doc.id);
              // Skip this document and continue
            }
          });
          
          console.log(`subscribeToUsers: Successfully processed ${users.length} users from Firestore`);
          callback(users);
        } catch (processingError) {
          console.error('subscribeToUsers: Error processing query snapshot:', processingError);
          console.error('Error stack:', processingError.stack);
          callback([]);
        }
      }, 
      (error) => {
        console.error('subscribeToUsers: Firestore subscription error:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        // If permission denied, log auth status
        if (error.code === 'permission-denied') {
          console.error('subscribeToUsers: Permission denied - Auth status:', {
            hasAuthUser: !!auth.currentUser,
            authUserId: auth.currentUser?.uid,
            authUserEmail: auth.currentUser?.email
          });
          console.error('subscribeToUsers: Make sure Firestore rules are deployed and require authentication');
          console.error('subscribeToUsers: To deploy rules, run: firebase deploy --only firestore:rules');
        }
        
        // Return empty array on error but don't break the app
        callback([]); // Return empty array on error
      }
    );
    
    console.log('subscribeToUsers: Subscription created successfully');
    return unsubscribe;
  } catch (error) {
    console.error('subscribeToUsers: Firestore subscription setup error:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    callback([]); // Return empty array on error
    return () => {}; // Return empty unsubscribe function
  }
};

// Function to check if a user is a friend
export const isUserFriend = async (friendUid) => {
  // Use auth.currentUser as fallback if currentUser is not set
  const authUser = auth.currentUser;
  const user = currentUser || authUser;
  
  if (!user || !db) {
    return false;
  }

  try {
    // Get the current user's document to check their friends list
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
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