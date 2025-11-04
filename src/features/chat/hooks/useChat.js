import { useState, useEffect, useCallback, useRef } from 'react';
import { sendMessage, subscribeToMessages } from '@/features/chat/services/chatService';
import { getCurrentUser } from '@/features/user/services/userService';

export const useChat = (selectedChat) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const messageSubscriptionRef = useRef(null);
  const user = getCurrentUser();
  const prevMessagesRef = useRef([]);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Subscribe to messages when selectedChat changes
  useEffect(() => {
    if (selectedChat && selectedChat.uid) {
      // Clean up previous subscription
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current();
      }
      
      // Subscribe to new messages
      messageSubscriptionRef.current = subscribeToMessages(selectedChat.uid, (newMessages) => {
        // Only update state if messages have actually changed
        const prevMessages = prevMessagesRef.current;
        if (JSON.stringify(prevMessages) !== JSON.stringify(newMessages)) {
          setMessages(newMessages);
          prevMessagesRef.current = newMessages;
        }
      });
    }
    
    return () => {
      // Clean up subscription on unmount or when chat changes
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current();
        messageSubscriptionRef.current = null;
      }
      prevMessagesRef.current = [];
    };
  }, [selectedChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle sending a message
  const handleSendMessage = useCallback(async (e) => {
    e?.preventDefault();
    if (!message.trim() || !selectedChat || isSending) return;
    
    setIsSending(true);
    setError(null);
    
    try {
      // Create message data object
      const messageData = {
        text: message.trim(),
        name: user?.displayName || 'Anonymous',
        photoURL: user?.photoURL || null,
        you: true
      };
      
      // Send message with correct parameters
      await sendMessage(messageData, selectedChat.uid);
      setMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }, [message, selectedChat, isSending, user]);

  // Format message time
  const formatMessageTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    
    // Handle Firestore timestamp objects
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Handle regular Date objects or timestamp strings
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  return {
    messages,
    message,
    setMessage,
    isSending,
    error,
    messagesEndRef,
    handleSendMessage,
    formatMessageTime,
    scrollToBottom
  };
};