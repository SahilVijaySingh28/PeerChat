import React from 'react';
import { getCurrentUser, canSeeOnlineStatus } from '@/features/user/services/userService';

export const OnlineStatus = ({ isOnline, lastSeen, showText = false, size = 'sm', user }) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Get current user
  const currentUser = getCurrentUser();
  
  // Check if we're displaying the current user's status
  const isCurrentUser = user && currentUser && user.uid === currentUser.uid;
  
  // Check if current user can see this user's online status
  const canSeeStatus = user ? canSeeOnlineStatus(user) : true;

  // Check if user has chosen to appear offline
  const appearOffline = user?.appearOffline || false;

  console.log('OnlineStatus component debug:', { 
    userUid: user?.uid, 
    isCurrentUser, 
    isOnline, 
    canSeeStatus, 
    appearOffline, 
    lastSeen: lastSeen?.toDate ? lastSeen.toDate() : lastSeen,
    currentUserUid: currentUser?.uid
  });

  // For current user, show online status based on their appearOffline setting
  if (isCurrentUser) {
    if (appearOffline) {
      return (
        <div className="flex items-center">
          <div className={`${sizeClasses[size]} bg-gray-400 rounded-full border border-card`}></div>
          {showText && <span className={`ml-1 ${textSizeClasses[size]} text-muted-foreground`}>Offline</span>}
        </div>
      );
    } else {
      return (
        <div className="flex items-center">
          <div className={`${sizeClasses[size]} bg-green-500 rounded-full border border-card`}></div>
          {showText && <span className={`ml-1 ${textSizeClasses[size]} text-green-500`}>Online</span>}
        </div>
      );
    }
  }

  if (isOnline && canSeeStatus && !appearOffline) {
    return (
      <div className="flex items-center">
        <div className={`${sizeClasses[size]} bg-green-500 rounded-full border border-card`}></div>
        {showText && <span className={`ml-1 ${textSizeClasses[size]} text-green-500`}>Online</span>}
      </div>
    );
  }

  if (lastSeen && canSeeStatus && !appearOffline) {
    // Format last seen time
    const now = new Date();
    const lastSeenDate = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
    
    let lastSeenText = '';
    if (diffInMinutes < 1) {
      lastSeenText = 'Just now';
    } else if (diffInMinutes < 60) {
      lastSeenText = `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      lastSeenText = `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      lastSeenText = `${Math.floor(diffInMinutes / 1440)}d ago`;
    }

    return (
      <div className="flex items-center">
        <div className={`${sizeClasses[size]} bg-gray-400 rounded-full border border-card`}></div>
        {showText && <span className={`ml-1 ${textSizeClasses[size]} text-muted-foreground`}>{lastSeenText}</span>}
      </div>
    );
  }

  // If user has privacy settings that hide their status, or no status info available, or appear offline
  return (
    <div className="flex items-center">
      <div className={`${sizeClasses[size]} bg-gray-400 rounded-full border border-card`}></div>
      {showText && <span className={`ml-1 ${textSizeClasses[size]} text-muted-foreground`}>Offline</span>}
    </div>
  );
};