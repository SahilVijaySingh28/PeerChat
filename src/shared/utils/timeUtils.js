/**
 * Utility functions for formatting dates and times
 */

/**
 * Format a timestamp to a localized time string
 * @param {Date|number|string} timestamp - The timestamp to format
 * @returns {string} Formatted time string
 */
export const formatTime = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    const date = timestamp instanceof Date 
      ? timestamp 
      : typeof timestamp === 'string' 
        ? new Date(timestamp) 
        : new Date(timestamp);
        
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
};

/**
 * Format a timestamp to a localized date string
 * @param {Date|number|string} timestamp - The timestamp to format
 * @returns {string} Formatted date string
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    const date = timestamp instanceof Date 
      ? timestamp 
      : typeof timestamp === 'string' 
        ? new Date(timestamp) 
        : new Date(timestamp);
        
    return date.toLocaleDateString();
  } catch (e) {
    return '';
  }
};

/**
 * Format a timestamp to a relative time string (e.g., "5 minutes ago")
 * @param {Date|number|string} timestamp - The timestamp to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Unknown time';
  
  try {
    const date = timestamp instanceof Date 
      ? timestamp 
      : typeof timestamp === 'string' 
        ? new Date(timestamp) 
        : new Date(timestamp);
        
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 0) return 'Just now';
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  } catch (e) {
    return 'Unknown time';
  }
};

/**
 * Format call duration in seconds to HH:MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatCallDuration = (seconds) => {
  if (typeof seconds !== 'number' || seconds < 0) return '00:00';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format last seen time
 * @param {Date|number|string} lastSeen - The last seen timestamp
 * @returns {string} Formatted last seen string
 */
export const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'Offline';
  
  try {
    const date = lastSeen instanceof Date 
      ? lastSeen 
      : typeof lastSeen === 'string' 
        ? new Date(lastSeen) 
        : lastSeen.toDate 
          ? lastSeen.toDate() 
          : new Date(lastSeen);
          
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  } catch (e) {
    return 'Offline';
  }
};