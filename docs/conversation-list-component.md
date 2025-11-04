# ConversationList Component Documentation

## Overview
The `ConversationList` component displays a list of conversations (friends) and provides functionality for searching conversations and adding new friends.

## Usage

```javascript
import { ConversationList } from '@/features/chat/components/conversation-list';

function Sidebar() {
  const handleSelectChat = (user) => {
    // Handle chat selection
  };
  
  return (
    <ConversationList onSelectChat={handleSelectChat} />
  );
}
```

## Props

### onSelectChat
(Function) Callback function called when a conversation is selected.

**Parameters:**
- `user` (Object): The user object representing the selected conversation

## State Management

The component manages several pieces of state:

1. **chats** - Array of friend objects displayed in the conversation list
2. **showAddFriend** - Boolean controlling visibility of the add friend modal
3. **friendRequestStatus** - String containing status messages for friend requests
4. **searchQuery** - String for filtering conversations in the main list
5. **userSearchQuery** - String for searching users in the add friend modal
6. **filteredUsers** - Array of users matching the search in the add friend modal
7. **latestMessages** - Object mapping user IDs to their latest message previews

## Key Features

### Conversation Display
- Shows all friends in the user's friends list
- Displays the user's own profile as a conversation
- Shows online status indicators
- Displays latest message previews
- Shows last seen timestamps

### Search Functionality
- Filters conversations based on name or message content
- Real-time filtering as the user types

### Add Friend Modal
- Search for users by name or email across the entire user base
- Display search results with avatars and user information
- Send friend requests directly from search results
- Manual email entry for friend requests

### Responsive Design
- Works on mobile, tablet, and desktop screen sizes
- Adapts layout based on screen dimensions

## Implementation Details

### Subscriptions
The component subscribes to two real-time data sources:

1. **Friends List** - Uses `subscribeToFriends` from userService to get real-time updates to the friends list
2. **Latest Messages** - Uses `subscribeToLatestMessages` from chatService to get real-time updates to message previews

### Effects
The component uses several useEffect hooks:

1. **Friends Subscription** - Sets up and cleans up the friends subscription
2. **Messages Subscription** - Sets up and cleans up the latest messages subscription
3. **User Search** - Implements debounced search for users in the add friend modal

### Event Handlers
- **handleSelectChat** - Calls the onSelectChat prop with the selected user
- **handleAddFriend** - Sends a friend request to a user by email
- **handleSelectUser** - Helper function to send a friend request to a user from search results

## Best Practices

1. **Performance** - Uses debouncing for search to prevent excessive API calls
2. **Memory Management** - Properly cleans up subscriptions to prevent memory leaks
3. **Error Handling** - Displays user-friendly error messages for failed operations
4. **Accessibility** - Implements proper ARIA labels and keyboard navigation
5. **Responsive Design** - Adapts to different screen sizes

## Example Usage

```javascript
import { ConversationList } from '@/features/chat/components/conversation-list';

function ChatApp() {
  const [selectedChat, setSelectedChat] = useState(null);
  
  return (
    <div className="flex">
      <div className="w-80">
        <ConversationList onSelectChat={setSelectedChat} />
      </div>
      <div className="flex-1">
        {selectedChat ? (
          <ChatThread selectedChat={selectedChat} />
        ) : (
          <div>Select a conversation to start chatting</div>
        )}
      </div>
    </div>
  );
}
```