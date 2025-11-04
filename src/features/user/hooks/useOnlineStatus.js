import { useState, useEffect, useCallback } from 'react';
import { 
  getCurrentUser, 
  trackUserActivity, 
  updateUserOnlineStatus,
  subscribeToFriends,
  canSeeOnlineStatus
} from '@/features/user/services/userService';

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [friends, setFriends] = useState([]);
  const [user, setUser] = useState(null);
  const [activityTimer, setActivityTimer] = useState(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize user
  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  // Subscribe to friends
  useEffect(() => {
    const unsubscribe = subscribeToFriends((friends) => {
      setFriends(Array.isArray(friends) ? friends : []);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Track user activity
  const trackActivity = useCallback(() => {
    if (user) {
      // Check if user has chosen to appear offline
      const shouldAppearOffline = user.appearOffline || false;
      
      if (shouldAppearOffline) {
        // If user chose to appear offline, set them as offline
        updateUserOnlineStatus(false);
      } else {
        // Track initial activity
        trackUserActivity();
        
        // Set up event listeners for user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        const handleActivity = () => trackUserActivity();
        
        events.forEach(event => {
          window.addEventListener(event, handleActivity);
        });
        
        // Store timer for cleanup
        setActivityTimer(events);
        
        // Cleanup
        return () => {
          events.forEach(event => {
            window.removeEventListener(event, handleActivity);
          });
        };
      }
    }
  }, [user]);

  // Check if current user can see another user's online status
  const canSeeStatus = useCallback((targetUser) => {
    return canSeeOnlineStatus(targetUser);
  }, []);

  // Format last seen time
  const formatLastSeen = useCallback((lastSeen) => {
    if (!lastSeen) return 'Offline';
    
    const now = new Date();
    let lastSeenDate;
    
    try {
      if (lastSeen.toDate) {
        lastSeenDate = lastSeen.toDate();
      } else if (typeof lastSeen === 'string') {
        lastSeenDate = new Date(lastSeen);
      } else if (lastSeen instanceof Date) {
        lastSeenDate = lastSeen;
      } else {
        return 'Offline';
      }
    } catch (e) {
      return 'Offline';
    }
    
    const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }, []);

  return {
    isOnline,
    friends,
    user,
    trackActivity,
    canSeeStatus,
    formatLastSeen
  };
};