import { useState, useEffect, useCallback } from 'react';
import { 
  subscribeToNotifications, 
  markNotificationAsRead,
  clearAllNotifications
} from '@/features/user/services/userService';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Subscribe to notifications
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((notifications) => {
      const validNotifications = Array.isArray(notifications) ? notifications : [];
      setNotifications(validNotifications);
      setUnreadCount(validNotifications.filter(n => !n.read).length);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Mark a notification as read
  const markAsRead = useCallback(async (notification) => {
    try {
      await markNotificationAsRead(notification);
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.timestamp === notification.timestamp && 
          n.type === notification.type && 
          n.message === notification.message
            ? { ...n, read: true }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Get unread count
  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    clearAll,
    getUnreadCount
  };
};