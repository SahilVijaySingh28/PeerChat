import { Search, UserPlus, X, Clock } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/avatar"
import { OnlineStatus } from "@/shared/components/online-status"
import { useState, useEffect, useRef } from "react"
import { subscribeToFriends, getCurrentUser, sendFriendRequest, searchAllUsers } from "@/features/user/services/userService"
import { subscribeToLatestMessages } from "@/features/chat/services/chatService"

export function ConversationList({ onSelectChat }) {
  const [chats, setChats] = useState([])
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [friendRequestStatus, setFriendRequestStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('') // Add search state
  const [userSearchQuery, setUserSearchQuery] = useState('') // Search for users in add friend section
  const [filteredUsers, setFilteredUsers] = useState([]) // Filtered users for add friend section
  const [latestMessages, setLatestMessages] = useState({}) // Latest messages for each conversation
  const currentUser = getCurrentUser()
  const currentUserId = currentUser?.uid // Extract the UID for dependency array
  const friendsSubscriptionRef = useRef(null)
  const messagesSubscriptionRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  useEffect(() => {
    // Clean up previous subscriptions
    if (friendsSubscriptionRef.current) {
      friendsSubscriptionRef.current();
      friendsSubscriptionRef.current = null;
    }

    // Subscribe to friends only from Firestore to create chat list
    friendsSubscriptionRef.current = subscribeToFriends((friends) => {
      console.log('Friends updated:', friends); // Debug log
      // Transform friends data to match the expected format
      const chatList = (Array.isArray(friends) ? friends : [])
        .map(friend => ({
          name: friend.name || friend.displayName || friend.email || `User${friend.uid.substring(0, 5)}`,
          preview: "Send a message...",
          initials: friend.name || friend.displayName || friend.email 
            ? (friend.name || friend.displayName || friend.email).split(" ").map(n => n[0]).join("").slice(0, 2)
            : "U",
          uid: friend.uid,
          photoURL: friend.photoURL || "/diverse-avatars.png", // Add fallback
          lastSeen: friend.lastSeen || null,
          isOnline: friend.isOnline || false,
          // Pass the entire friend object so OnlineStatus can access all properties
          ...friend
        }));
      
      console.log('Chat list:', chatList); // Debug log
      
      // Add current user to the list
      if (currentUser) {
        // Check if current user is already in the list
        const currentUserInList = chatList.find(chat => chat.uid === currentUser.uid);
        if (!currentUserInList) {
          // Add current user if not in the list
          chatList.push({
            name: currentUser.displayName || currentUser.email || `User${currentUser.uid.substring(0, 5)}`,
            preview: "Send a message...",
            initials: currentUser.displayName || currentUser.email 
              ? (currentUser.displayName || currentUser.email).split(" ").map(n => n[0]).join("").slice(0, 2)
              : "U",
            uid: currentUser.uid,
            photoURL: currentUser.photoURL || "/diverse-avatars.png", // Add fallback
            lastSeen: new Date(),
            isOnline: true,
            // Pass the entire currentUser object so OnlineStatus can access all properties
            ...currentUser
          });
        }
      }
      
      setChats(chatList);
    });

    // Clean up listeners on component unmount
    return () => {
      if (friendsSubscriptionRef.current) {
        friendsSubscriptionRef.current();
        friendsSubscriptionRef.current = null;
      }
    };
  }, [currentUserId]); // Use currentUserId instead of currentUser object

  // Subscribe to latest messages to update conversation previews
  useEffect(() => {
    if (messagesSubscriptionRef.current) {
      messagesSubscriptionRef.current();
    }

    messagesSubscriptionRef.current = subscribeToLatestMessages((messages) => {
      const latest = {};
      messages.forEach(msg => {
        latest[msg.otherUserId] = msg;
      });
      setLatestMessages(latest);
    });

    return () => {
      if (messagesSubscriptionRef.current) {
        messagesSubscriptionRef.current();
      }
    };
  }, []);

  // Effect to handle user search in add friend modal
  useEffect(() => {
    if (!userSearchQuery.trim()) {
      setFilteredUsers([])
      return
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout to debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchAllUsers(userSearchQuery)
        setFilteredUsers(results)
      } catch (error) {
        console.error('Error searching users:', error)
        setFilteredUsers([])
      }
    }, 300) // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [userSearchQuery])

  // Function to handle chat selection
  const handleSelectChat = (chat) => {
    if (onSelectChat) {
      onSelectChat(chat);
    }
  };

  // Function to handle adding a new friend
  const handleAddFriend = async (email) => {
    if (!email) {
      setFriendRequestStatus('Please select a user');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFriendRequestStatus('Invalid email address');
      return;
    }

    // Prevent users from adding themselves
    if (currentUser && email === currentUser.email) {
      setFriendRequestStatus('You cannot add yourself as a friend');
      return;
    }

    setFriendRequestStatus('Sending friend request...');
    
    try {
      // Send friend request
      await sendFriendRequest(email);
      
      setFriendRequestStatus(`Friend request sent to ${email}!`);
      
      // Hide the add friend form after 2 seconds
      setTimeout(() => {
        setShowAddFriend(false);
        setFriendRequestStatus('');
        setUserSearchQuery('');
        setFilteredUsers([]);
      }, 2000);
    } catch (error) {
      console.error('Friend request error:', error);
      if (error.message === 'User with this email not found') {
        setFriendRequestStatus('User not found. Please check the email address.');
      } else if (error.message === 'Permission denied. You may not have access to send friend requests.') {
        setFriendRequestStatus('Permission denied. Please check your account permissions.');
      } else if (error.message === 'Too many requests. Please wait a moment and try again.') {
        setFriendRequestStatus('Too many requests. Please wait a moment and try again.');
      } else {
        setFriendRequestStatus('Failed to send friend request. Please try again.');
      }
    }
  };

  // Function to select a user from search results
  const handleSelectUser = (user) => {
    handleAddFriend(user.email);
  };

  // Filter chats based on search query - only search friends
  const filteredChats = searchQuery 
    ? chats.filter(chat => 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.preview.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chats;

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

  return (
    <div className="h-full flex flex-col bg-card rounded-xl border shadow-sm mobile-chat-list">
      {/* Header */}
      <div className="p-3 sm:p-4 md:p-5 border-b">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-responsive-lg font-semibold">Conversations</h2>
          <button 
            onClick={() => setShowAddFriend(true)}
            className="p-2 rounded-lg bg-secondary hover:bg-muted transition-colors"
            aria-label="Add friend"
          >
            <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
        
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted border focus:outline-none focus:ring-2 focus:ring-primary text-responsive-sm"
          />
        </div>
      </div>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div className="fixed inset-0 z-[6000] bg-black/50 flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-md bg-card rounded-2xl border shadow-2xl">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b">
              <h3 className="text-responsive-lg font-semibold">Add Friend</h3>
              <button
                onClick={() => {
                  setShowAddFriend(false);
                  setFriendRequestStatus('');
                  setUserSearchQuery('');
                  setFilteredUsers([]);
                }}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-3 sm:p-4">
              <div className="relative mb-3 sm:mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted border focus:outline-none focus:ring-2 focus:ring-primary text-responsive-sm"
                />
              </div>
              
              {/* Display search results */}
              {userSearchQuery && (
                <div className="mb-3 sm:mb-4 max-h-40 overflow-y-auto">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <div
                        key={user.uid}
                        onClick={() => handleSelectUser(user)}
                        className="flex items-center gap-3 p-2 hover:bg-muted cursor-pointer rounded-lg"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.photoURL} alt={user.name} />
                          <AvatarFallback className="bg-secondary text-xs">
                            {user.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-responsive-sm">{user.name || user.email}</div>
                          {user.email && user.name && (
                            <div className="text-muted-foreground text-responsive-xs truncate">{user.email}</div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-center text-muted-foreground text-responsive-sm">
                      No users found
                    </div>
                  )}
                </div>
              )}
              
              {friendRequestStatus && (
                <div className="mb-3 sm:mb-4 p-3 rounded-lg bg-secondary text-center text-responsive-sm">
                  {friendRequestStatus}
                </div>
              )}
              
              <button
                onClick={(e) => {
                  const input = e.target.closest('.p-3').querySelector('input');
                  const email = input.value;
                  if (email) {
                    handleAddFriend(email);
                  }
                }}
                className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-responsive-sm">
                Send Friend Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 sm:p-8 text-center text-muted-foreground">
            <Search className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 mx-auto" />
            <h3 className="text-responsive-lg font-medium mb-1">No conversations yet</h3>
            <p className="text-responsive-sm">Start a conversation with a friend or add new friends</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredChats.map((chat) => {
              // Get latest message for this chat
              const latestMessage = latestMessages[chat.uid];
              const previewText = latestMessage 
                ? latestMessage.text 
                : "Send a message...";
              
              return (
                <div
                  key={chat.uid}
                  onClick={() => handleSelectChat(chat)}
                  className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={chat.photoURL} alt={chat.name} />
                      <AvatarFallback className="bg-secondary">
                        {chat.initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate text-responsive-sm">{chat.uid === currentUser?.uid ? 'Me' : chat.name}</div>
                      {chat.lastSeen && (
                        <div className="text-muted-foreground text-responsive-xs">
                          {formatLastSeen(chat.lastSeen)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-muted-foreground truncate text-responsive-xs">{previewText}</p>
                      <OnlineStatus isOnline={chat.isOnline} lastSeen={chat.lastSeen} showText={true} size="sm" user={chat} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}