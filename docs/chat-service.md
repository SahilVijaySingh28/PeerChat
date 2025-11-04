# Chat Service Documentation

## Overview
The Chat Service handles all messaging functionality in FlashChat, including sending messages, subscribing to message streams, and retrieving latest messages for conversation lists.

## Functions

### sendMessage(messageData, recipientUserId)
Sends a message to a specific user.

**Parameters:**
- `messageData` (Object): Contains the message text and metadata
- `recipientUserId` (String): The Firebase UID of the message recipient

**Returns:**
- Promise resolving to the document ID of the sent message, or null if failed

**Example:**
```javascript
const messageData = {
  text: "Hello, world!",
  name: "John Doe",
  photoURL: "https://example.com/avatar.jpg"
};

const messageId = await sendMessage(messageData, "recipientFirebaseUid");
```

### subscribeToMessages(selectedUserId, callback)
Subscribes to real-time message updates for a conversation with a specific user.

**Parameters:**
- `selectedUserId` (String): The Firebase UID of the conversation partner
- `callback` (Function): Called with an array of messages when updates occur

**Returns:**
- Unsubscribe function to clean up the listener

**Example:**
```javascript
const unsubscribe = subscribeToMessages("friendFirebaseUid", (messages) => {
  // Update UI with messages
  setMessages(messages);
});

// Clean up when component unmounts
useEffect(() => {
  return () => unsubscribe();
}, []);
```

### subscribeToLatestMessages(callback)
Subscribes to the latest message from each conversation for display in the conversation list.

**Parameters:**
- `callback` (Function): Called with an array of latest messages when updates occur

**Returns:**
- Unsubscribe function to clean up the listener

**Example:**
```javascript
const unsubscribe = subscribeToLatestMessages((latestMessages) => {
  // Update conversation list with latest messages
  setLatestMessages(latestMessages);
});

// Clean up when component unmounts
useEffect(() => {
  return () => unsubscribe();
}, []);
```