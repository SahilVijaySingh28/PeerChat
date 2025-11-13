import { Paperclip, Mic, Smile, Send, Phone, Video, Ellipsis, LogOut, X, Check, CheckCheck, Clock, MessageCircle, XCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/avatar"
import { OnlineStatus } from "@/shared/components/online-status"
import { VideoCall } from "@/features/call/components/video-call"
import { AudioCall } from "@/features/call/components/audio-call"
import { useState, useEffect, useRef } from "react"
import { useChat } from "@/features/chat/hooks/useChat"
import { getCurrentUser, updateUserProfile, signOutUser, unfriendUser, sendVideoCallNotification, setAppearOffline } from "@/features/user/services/userService"
import { createCallDocument } from "@/features/call/services/callService"

export function ChatThread({ selectedChat, onClose, showCloseButton = false }) {
  const { 
    messages: chatMessages, 
    message, 
    setMessage, 
    handleSendMessage, 
    formatMessageTime, 
    messagesEndRef 
  } = useChat(selectedChat);
  
  const [userName, setUserName] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [showVideoCall, setShowVideoCall] = useState(false)
  const [showAudioCall, setShowAudioCall] = useState(false)
  const [isCalling, setIsCalling] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [activeCallId, setActiveCallId] = useState(null) // Store the active call ID
  const dropdownRef = useRef(null)
  const ellipsisRef = useRef(null)
  const user = getCurrentUser()
  const currentUserId = user ? user.uid : null
  const fileInputRef = useRef(null)

  // Set chat title when selectedChat changes
  useEffect(() => {
    if (selectedChat) {
      setUserName(selectedChat.name || selectedChat.displayName || "Unknown User");
    }
  }, [selectedChat]);

  // Function to handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      alert(`File selected: ${file.name}
File type: ${file.type}
File size: ${file.size} bytes

In a real application, this file would be uploaded and sent as a message.`);
      // Reset the file input
      e.target.value = '';
    }
  };

  // Function to handle emoji selection
  const handleEmojiSelect = (emoji) => {
    setMessage(prevMessage => prevMessage + emoji);
  };

  // Function to show emoji picker
  const showEmojiPicker = () => {
    const emojis = ['😀', '😂', '😍', '😎', '👍', '👏', '❤️', '🔥', '🎉', '✨'];
    const selectedEmoji = prompt(`Select an emoji:
${emojis.join(' ')}`);
    if (selectedEmoji && emojis.includes(selectedEmoji)) {
      handleEmojiSelect(selectedEmoji);
    }
  };

  // Function to handle attach file
  const handleAttachFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Function to start video call
  const startVideoCall = async () => {
    if (!selectedChat) return;
    
    // Prevent users from calling themselves
    if (selectedChat.uid === user?.uid) {
      alert("You cannot make a video call to yourself.");
      return;
    }
    
    setIsCalling(true);
    
    try {
      // Create call document in Firestore
      const callId = await createCallDocument(user.uid, selectedChat.uid);
      setActiveCallId(callId); // Store the call ID
      
      // Send video call notification
      await sendVideoCallNotification(selectedChat.uid, user, callId);
      
      // Show video call interface
      setShowVideoCall(true);
    } catch (error) {
      console.error("Error starting video call:", error);
      alert("Failed to start video call. Please try again.");
    } finally {
      setIsCalling(false);
    }
  };

  // Function to start audio call
  const startAudioCall = async () => {
    if (!selectedChat) return;
    
    // Prevent users from calling themselves
    if (selectedChat.uid === user?.uid) {
      alert("You cannot make an audio call to yourself.");
      return;
    }
    
    setIsCalling(true);
    
    try {
      // Create call document in Firestore
      const callId = await createCallDocument(user.uid, selectedChat.uid);
      setActiveCallId(callId); // Store the call ID
      
      // Send audio call notification
      await sendVideoCallNotification(selectedChat.uid, user, callId);
      
      // Show audio call interface
      setShowAudioCall(true);
    } catch (error) {
      console.error("Error starting audio call:", error);
      alert("Failed to start audio call. Please try again.");
    } finally {
      setIsCalling(false);
    }
  };



  // Get message status icon
  const getMessageStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <Check className="h-4 w-4 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-4 w-4 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Handle unfriend action
  const handleUnfriend = async () => {
    if (!selectedChat) return;
    
    try {
      await unfriendUser(selectedChat.uid);
      setShowDropdown(false);
    } catch (error) {
      console.error("Error unfriending user:", error);
      alert("Failed to unfriend user. Please try again.");
      setShowDropdown(false);
    }
  };

  // Toggle appear offline mode
  const toggleAppearOffline = async () => {
    try {
      const currentUser = getCurrentUser();
      const newAppearOfflineStatus = !currentUser?.appearOffline;
      await setAppearOffline(newAppearOfflineStatus);
      setShowDropdown(false);
      // Instead of reloading the page, just update the user state
      // window.location.reload();
    } catch (error) {
      console.error("Error toggling appear offline:", error);
      alert("Failed to update appear offline status. Please try again.");
      setShowDropdown(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOutUser();
      setShowDropdown(false);
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Failed to sign out. Please try again.");
      setShowDropdown(false);
    }
  };

  // Toggle dropdown menu
  const toggleDropdown = () => {
    setShowDropdown(prev => !prev);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          ellipsisRef.current && !ellipsisRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Close chat on mobile
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // If no chat is selected, show a placeholder
  if (!selectedChat) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 bg-card rounded-xl border shadow-sm mobile-chat-thread">
        <div className="text-center max-w-xs">
          <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-responsive-xl font-semibold mb-2">PeerChat</h3>
          <p className="text-muted-foreground mb-6 text-responsive-sm">
            Select a conversation to start chatting
          </p>
        </div>
      </div>
    );
  }

  // Get chat title
  const chatTitle = selectedChat 
    ? selectedChat.uid === user?.uid 
      ? "Me" 
      : selectedChat.name || selectedChat.displayName || selectedChat.email || "Unknown User"
    : "PeerChat";

  return (
    <div className="h-[90vh] flex flex-col bg-card rounded-xl border shadow-sm mobile-chat-thread">
      {/* Chat header */}
      <div className="flex items-center justify-between p-3 sm:p-4 md:p-5 border-b flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          {showCloseButton && (
            <button
              onClick={handleClose}
              className="p-1 rounded-lg hover:bg-muted transition-colors lg:hidden"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          <div className="relative">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
              <AvatarImage src={selectedChat.photoURL || "/diverse-avatars.png"} alt={chatTitle} />
              <AvatarFallback className="bg-secondary text-responsive-xs">
                {chatTitle?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h3 className="font-semibold text-responsive-sm sm:font-semibold sm:text-responsive-base">{chatTitle}</h3>
            <div className="flex items-center text-muted-foreground text-responsive-xs">
              <OnlineStatus isOnline={selectedChat.isOnline} lastSeen={selectedChat.lastSeen} showText={true} size="sm" user={selectedChat} />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={startAudioCall}
            disabled={isCalling}
            className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            aria-label="Audio call"
          >
            <Phone className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            onClick={startVideoCall}
            disabled={isCalling}
            className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            aria-label="Video call"
          >
            <Video className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <div className="relative" ref={ellipsisRef}>
            <button
              onClick={toggleDropdown}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Chat options"
            >
              <Ellipsis className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            
            {/* Dropdown menu */}
            {showDropdown && (
              <div 
                ref={dropdownRef}
                className="absolute right-0 top-full mt-2 w-48 bg-card border rounded-lg shadow-lg z-50"
                style={{ position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem' }}
              >
                <button
                  onClick={() => {
                    handleUnfriend();
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  <span className="text-responsive-sm">Unfriend</span>
                </button>
                <button
                  onClick={() => {
                    toggleAppearOffline();
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2"
                >
                  <span className="text-responsive-sm">
                    {user?.appearOffline ? "Appear Online" : "Appear Offline"}
                  </span>
                </button>
                <button
                  onClick={() => {
                    handleSignOut();
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-responsive-sm">Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Messages area - Fixed height with scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 max-h-[calc(90vh-180px)]">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-responsive-xl font-semibold mb-2">No messages yet</h3>
            <p className="text-muted-foreground text-responsive-sm">
              Start a conversation with {chatTitle}
            </p>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.userId === currentUserId ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl px-4 py-2 ${
                  msg.userId === currentUserId 
                    ? 'bg-primary text-primary-foreground rounded-br-none' 
                    : 'bg-muted rounded-bl-none'
                }`}
              >
                <p className="text-responsive-sm">{msg.text}</p>
                <div className={`flex items-center justify-end gap-1 mt-1 ${
                  msg.userId === currentUserId ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  <span className="text-responsive-xs">{formatMessageTime(msg.timestamp)}</span>
                  {msg.userId === currentUserId && getMessageStatusIcon('sent')}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Typing indicator */}
      {isTyping && (
        <div className="px-4 py-2 flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={selectedChat.photoURL || "/diverse-avatars.png"} alt={chatTitle} />
            <AvatarFallback className="bg-secondary text-responsive-xs">
              {chatTitle?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex gap-1">
            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      )}
      
      {/* Input area */}
      <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAttachFile}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={showEmojiPicker}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Add emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-4 py-2 rounded-full bg-muted border focus:outline-none focus:ring-2 focus:ring-primary text-responsive-sm"
            />
          </div>
          <button
            type="submit"
            disabled={!message.trim()}
            className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
      
      {/* Video Call Modal */}
      {showVideoCall && (
        <VideoCall
          selectedChat={selectedChat}
          role="caller"
          callId={activeCallId}
          onClose={() => {
            setShowVideoCall(false);
            setActiveCallId(null);
          }}
          onCallEnd={() => {
            setShowVideoCall(false);
            setActiveCallId(null);
          }}
        />
      )}
      
      {/* Audio Call Modal */}
      {showAudioCall && (
        <AudioCall
          selectedChat={selectedChat}
          role="caller"
          callId={activeCallId}
          onClose={() => {
            setShowAudioCall(false);
            setActiveCallId(null);
          }}
          onCallEnd={() => {
            setShowAudioCall(false);
            setActiveCallId(null);
          }}
        />
      )}
    </div>
  );
}