import { useState, useEffect, useCallback } from 'react';
import { 
  getCurrentUser, 
  subscribeToUsers, 
  subscribeToFriendRequests, 
  subscribeToNotifications,
  updateUserProfile,
  signOutUser,
  unfriendUser,
  sendVideoCallNotification,
  setAppearOffline,
  updateUserOnlineStatusPrivacy
} from '@/features/user/services/userService';

export const useUser = () => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize user and subscriptions
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const currentUser = getCurrentUser();
        setUser(currentUser);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  // Subscribe to users
  useEffect(() => {
    const unsubscribe = subscribeToUsers((users) => {
      setUsers(Array.isArray(users) ? users : []);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Subscribe to friend requests
  useEffect(() => {
    const unsubscribe = subscribeToFriendRequests((requests) => {
      setFriendRequests(Array.isArray(requests) ? requests : []);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Subscribe to notifications
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((notifications) => {
      setNotifications(Array.isArray(notifications) ? notifications : []);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Update user profile
  const updateProfile = useCallback(async (displayName) => {
    try {
      await updateUserProfile(displayName);
      // Refresh user data
      const currentUser = getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Sign out user
  const signOut = useCallback(async () => {
    try {
      await signOutUser();
      setUser(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Unfriend a user
  const unfriend = useCallback(async (friendUid, friendName) => {
    try {
      await unfriendUser(friendUid, friendName);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Send video call notification
  const sendCallNotification = useCallback(async (recipientUid, callerData, callId) => {
    try {
      return await sendVideoCallNotification(recipientUid, callerData, callId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Set appear offline status
  const setOfflineStatus = useCallback(async (appearOffline) => {
    try {
      await setAppearOffline(appearOffline);
      // Refresh user data
      const currentUser = getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Update online status privacy
  const updateOnlineStatusPrivacy = useCallback(async (privacySetting) => {
    try {
      await updateUserOnlineStatusPrivacy(privacySetting);
      // Refresh user data
      const currentUser = getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    user,
    users,
    friendRequests,
    notifications,
    loading,
    error,
    updateProfile,
    signOut,
    unfriend,
    sendCallNotification,
    setOfflineStatus,
    updateOnlineStatusPrivacy
  };
};