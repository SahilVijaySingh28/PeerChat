import { Phone, Video, Camera, Link, User, Mail, Bell, X, Check, XCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/avatar"
import { OnlineStatus } from "@/shared/components/online-status"
import { Search } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { subscribeToUsers, getCurrentUser, subscribeToFriendRequests, acceptFriendRequest, declineFriendRequest, subscribeToNotifications, markNotificationAsRead, updateUserOnlineStatusPrivacy, sendFriendRequest, isUserFriend } from "@/features/user/services/userService"

export function RightSidebar({ onUserClick }) {
  const [members, setMembers] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [friendRequestStatus, setFriendRequestStatus] = useState({})
  const [notificationStatus, setNotificationStatus] = useState({})
  const currentUser = getCurrentUser()
  const usersSubscriptionRef = useRef(null)
  const friendRequestsSubscriptionRef = useRef(null)
  const notificationsSubscriptionRef = useRef(null)

  useEffect(() => {
    // Clean up previous subscriptions
    if (usersSubscriptionRef.current) {
      usersSubscriptionRef.current();
      usersSubscriptionRef.current = null;
    }
    
    if (friendRequestsSubscriptionRef.current) {
      friendRequestsSubscriptionRef.current();
      friendRequestsSubscriptionRef.current = null;
    }
    
    if (notificationsSubscriptionRef.current) {
      notificationsSubscriptionRef.current();
      notificationsSubscriptionRef.current = null;
    }

    // Subscribe to all users from Firestore
    usersSubscriptionRef.current = subscribeToUsers((users) => {
      console.log('Users updated:', users); // Debug log
      // Transform users data to match the expected format
      const memberList = (Array.isArray(users) ? users : []).map(user => ({
        name: user.name || user.displayName || user.email || `User${user.uid.substring(0, 5)}`,
        role: user.uid === currentUser?.uid ? "You" : "",
        email: user.email,
        photoURL: user.photoURL,
        uid: user.uid,
        isOnline: user.isOnline || false,
        lastSeen: user.lastSeen || null,
        // Pass the entire user object so OnlineStatus can access all properties
        ...user
      }));
      
      console.log('Member list:', memberList); // Debug log
      
      // Sort to put current user at the top
      memberList.sort((a, b) => {
        if (a.role === "You") return -1;
        if (b.role === "You") return 1;
        return 0;
      });
      
      setMembers(memberList);
    });

    // Subscribe to friend requests
    friendRequestsSubscriptionRef.current = subscribeToFriendRequests((requests) => {
      setFriendRequests(Array.isArray(requests) ? requests : []);
    });

    // Subscribe to notifications
    notificationsSubscriptionRef.current = subscribeToNotifications((notifications) => {
      setNotifications(Array.isArray(notifications) ? notifications : []);
    });

    // Clean up listeners on component unmount
    return () => {
      if (usersSubscriptionRef.current) {
        usersSubscriptionRef.current();
        usersSubscriptionRef.current = null;
      }
      
      if (friendRequestsSubscriptionRef.current) {
        friendRequestsSubscriptionRef.current();
        friendRequestsSubscriptionRef.current = null;
      }
      
      if (notificationsSubscriptionRef.current) {
        notificationsSubscriptionRef.current();
        notificationsSubscriptionRef.current = null;
      }
    };
  }, []);

  // Monitor online/offline status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Function to handle user click
  const handleUserClick = async (user) => {
    // Check if the clicked user is the current user
    if (user.uid === currentUser?.uid) {
      // If it's the current user, just call onUserClick
      if (onUserClick) {
        onUserClick(user);
      }
      return;
    }
    
    // Check if the user is already a friend
    const isFriend = await isUserFriend(user.uid);
    
    if (isFriend) {
      // If user is already a friend, open chat
      if (onUserClick) {
        onUserClick(user);
      }
    } else {
      // If user is not a friend, send a friend request
      try {
        await sendFriendRequest(user.email);
        alert(`Friend request sent to ${user.name || user.email}!`);
      } catch (error) {
        console.error('Error sending friend request:', error);
        alert(`Failed to send friend request: ${error.message}`);
      }
    }
  };

  // Function to accept a friend request
  const handleAcceptRequest = async (request) => {
    try {
      const requestKey = `${request.from}-${request.timestamp}`;
      setFriendRequestStatus(prev => ({ ...prev, [requestKey]: 'Accepting...' }));
      await acceptFriendRequest(request);
      setFriendRequestStatus(prev => ({ ...prev, [requestKey]: 'Accepted!' }));
      // Remove status message after 2 seconds
      setTimeout(() => {
        setFriendRequestStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[requestKey];
          return newStatus;
        });
      }, 2000);
    } catch (error) {
      console.error('Error accepting friend request:', error);
      const requestKey = `${request.from}-${request.timestamp}`;
      setFriendRequestStatus(prev => ({ ...prev, [requestKey]: 'Failed to accept' }));
    }
  };

  // Function to decline a friend request
  const handleDeclineRequest = async (request) => {
    try {
      const requestKey = `${request.from}-${request.timestamp}`;
      setFriendRequestStatus(prev => ({ ...prev, [requestKey]: 'Declining...' }));
      await declineFriendRequest(request);
      setFriendRequestStatus(prev => ({ ...prev, [requestKey]: 'Declined!' }));
      // Remove status message after 2 seconds
      setTimeout(() => {
        setFriendRequestStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[requestKey];
          return newStatus;
        });
      }, 2000);
    } catch (error) {
      console.error('Error declining friend request:', error);
      const requestKey = `${request.from}-${request.timestamp}`;
      setFriendRequestStatus(prev => ({ ...prev, [requestKey]: 'Failed to decline' }));
    }
  };

  // Function to mark a notification as read
  const handleMarkAsRead = async (notification) => {
    try {
      const notificationKey = `${notification.timestamp}-${notification.type}-${notification.message}`;
      setNotificationStatus(prev => ({ ...prev, [notificationKey]: 'Marking as read...' }));
      await markNotificationAsRead(notification);
      setNotificationStatus(prev => ({ ...prev, [notificationKey]: 'Marked as read!' }));
      // Remove status message after 2 seconds
      setTimeout(() => {
        setNotificationStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[notificationKey];
          return newStatus;
        });
      }, 2000);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      const notificationKey = `${notification.timestamp}-${notification.type}-${notification.message}`;
      setNotificationStatus(prev => ({ ...prev, [notificationKey]: 'Failed to mark as read' }));
    }
  };

  // Function to toggle notifications visibility
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // Debugging: Log notifications when they change
  useEffect(() => {
    console.log('Notifications updated:', notifications);
    console.log('Unread notifications count:', notifications.filter(n => !n.read).length);
    // Log the read property of each notification for debugging
    notifications.forEach((n, index) => {
      console.log(`Notification ${index}:`, n);
      console.log(`  Has read property:`, 'read' in n);
      console.log(`  Read value:`, n.read);
    });
  }, [notifications]);

  // Function to update online status privacy
  const updatePrivacySetting = async (setting) => {
    try {
      await updateUserOnlineStatusPrivacy(setting);
      // Update local user state to reflect the change
      if (currentUser) {
        currentUser.onlineStatusPrivacy = setting;
      }
    } catch (error) {
      console.error("Error updating privacy setting:", error);
      alert("Failed to update privacy setting. Please try again.");
    }
  };

  // Format last seen time
  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return '';
    const now = new Date();
    const lastSeenDate = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Format notification timestamp
  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return 'Invalid Date';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      // Check if the date is valid
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      const now = new Date();
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      if (diffInMinutes < 43200) return `${Math.floor(diffInMinutes / 1440)}d ago`;
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting notification time:', error);
      return 'Invalid Date';
    }
  };

  return (
    <div className="flex h-[90vh] flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm relative overflow-hidden min-h-0">
      {/* User Profile */}
      {currentUser && (
        <section className="rounded-xl border bg-card p-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage alt="Your avatar" src={currentUser.photoURL || "/diverse-avatars.png"} />
                <AvatarFallback className="bg-secondary">
                  {currentUser.displayName
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2) || currentUser.email?.substring(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <OnlineStatus isOnline={!currentUser.appearOffline && currentUser.isOnline} lastSeen={currentUser.lastSeen} size="sm" user={currentUser} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{currentUser.displayName || "User"}</div>
              <div className="truncate text-xs text-muted-foreground">{currentUser.email}</div>
            </div>
            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={toggleNotifications}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 block h-5 w-5 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {/* Online Status Privacy Settings */}
          <div className="mt-3 pt-3 border-t">
            <div className="text-xs text-muted-foreground mb-2">Online Status Privacy</div>
            <div className="flex gap-2">
              <select 
                value={currentUser.onlineStatusPrivacy || 'friends'}
                onChange={(e) => updatePrivacySetting(e.target.value)}
                className="flex-1 text-xs bg-muted border rounded px-2 py-1"
              >
                <option value="everyone">Everyone</option>
                <option value="friends">Friends Only</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>
          </div>
        </section>
      )}
      
      {/* Notifications Panel - Overlay */}
      {showNotifications && currentUser && (
        <div className="absolute top-20 right-4 z-10 w-[calc(100%-2rem)] max-w-md rounded-xl border bg-secondary/50 p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-base font-semibold">Notifications</h4>
          </div>
          {notifications.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {notifications.map((notification) => (
                <div 
                  key={`${notification.timestamp}-${notification.type}-${notification.message}`} 
                  className={`p-3 rounded-lg ${notification.read ? 'bg-muted/50' : 'bg-white dark:bg-card border'}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {notification.type === 'friend_request' ? (
                        <User className="h-4 w-4 text-primary" />
                      ) : (
                        <Bell className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatNotificationTime(notification.timestamp)}
                      </p>
                    </div>
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification)}
                        className="p-1 rounded-full hover:bg-muted"
                        aria-label="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {notificationStatus[`${notification.timestamp}-${notification.type}-${notification.message}`] && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {notificationStatus[`${notification.timestamp}-${notification.type}-${notification.message}`]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Friend Requests */}
      {friendRequests.length > 0 && (
        <section className="rounded-xl border bg-card p-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">Friend Requests</h3>
            <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-1">
              {friendRequests.length}
            </span>
          </div>
          <div className="space-y-3 max-h-40 overflow-y-auto">
            {friendRequests.map((request) => (
              <div key={`${request.from}-${request.timestamp}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={request.fromPhotoURL || "/diverse-avatars.png"} alt={request.fromName} />
                  <AvatarFallback className="bg-secondary">
                    {request.fromName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-sm">{request.fromName}</div>
                  <div className="text-xs text-muted-foreground truncate">{request.fromEmail}</div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAcceptRequest(request)}
                    className="p-1.5 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
                    aria-label="Accept"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(request)}
                    className="p-1.5 rounded-full bg-destructive text-white hover:bg-destructive/90 transition-colors"
                    aria-label="Decline"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {friendRequestStatus[`${request.from}-${request.timestamp}`] && (
                  <div className="absolute right-2 bottom-0 text-xs text-muted-foreground">
                    {friendRequestStatus[`${request.from}-${request.timestamp}`]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      
      {/* Members List */}
      <section className="flex-1 rounded-xl border bg-card p-4 shadow-sm flex flex-col min-h-0">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">People</h3>
          <span className="text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-1">
            {members.length}
          </span>
        </div>
        <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
          {members.map((member) => (
            <div
              key={member.uid}
              onClick={() => handleUserClick(member)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors group"
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.photoURL || "/diverse-avatars.png"} alt={member.name} />
                  <AvatarFallback className="bg-secondary">
                    {member.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {member.isOnline && member.role !== "You" && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-card"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium truncate text-sm">{member.role === "You" ? "Me" : member.name}</div>
                  {member.role === "You" && (
                    <span className="text-xs bg-primary text-primary-foreground rounded px-1.5 py-0.5">
                      You
                    </span>
                  )}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <OnlineStatus isOnline={member.isOnline} lastSeen={member.lastSeen} showText={true} size="sm" user={member} />
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <button className="p-1.5 rounded-full hover:bg-secondary">
                  <Phone className="h-4 w-4" />
                </button>
                <button className="p-1.5 rounded-full hover:bg-secondary">
                  <Video className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}