# useChat Hook Documentation

## Overview
The `useChat` hook manages the state and functionality for chat messaging in FlashChat. It handles message input, sending messages, subscribing to message streams, and managing chat-related UI state.

## Usage

```javascript
import { useChat } from '@/features/chat/hooks/useChat';

function ChatComponent({ selectedChat }) {
  const {
    messages,
    message,
    setMessage,
    isSending,
    error,
    handleSendMessage
  } = useChat(selectedChat);
  
  // Render UI using the provided state and functions
}
```

## State Properties

### messages
(Array) Array of message objects in the current conversation.

### message
(String) Current text in the message input field.

### setMessage
(Function) Function to update the message input text.

### isSending
(Boolean) Whether a message is currently being sent.

### error
(String|null) Error message if an error occurred during message sending.

## Functions

### handleSendMessage(event)
Sends the current message to the selected chat user.

**Parameters:**
- `event` (Event): Form submission event

## Implementation Details

The hook manages several aspects of chat functionality:

1. **Message State**: Tracks the current message input and message history
2. **Message Sending**: Handles the process of sending messages through the chat service
3. **Message Subscription**: Subscribes to real-time message updates for the selected chat
4. **Error Handling**: Captures and exposes errors to the UI
5. **Loading States**: Manages the sending state to provide user feedback

## Best Practices

1. Always provide a selectedChat object with at least a `uid` property
2. Handle errors appropriately in the UI
3. Implement proper loading states using `isSending`
4. Clear the message input after successful sends
5. Use the subscription cleanup to prevent memory leaks

## Example Implementation

```javascript
import { useChat } from '@/features/chat/hooks/useChat';
import { useEffect, useRef } from 'react';

function ChatThread({ selectedChat }) {
  const {
    messages,
    message,
    setMessage,
    isSending,
    error,
    handleSendMessage
  } = useChat(selectedChat);
  
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-4">
            <div className={msg.you ? 'text-right' : 'text-left'}>
              <div className="inline-block p-3 rounded-lg bg-muted">
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {error && (
        <div className="p-2 text-red-500 bg-red-100">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSending}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded"
          />
          <button
            type="submit"
            disabled={isSending || !message.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
```