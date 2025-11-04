import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Phone, Video, X } from 'lucide-react';
import { subscribeToNotifications, getCurrentUser, markNotificationAsRead } from '@/features/user/services/userService';
import { listenForCallStatus, endCall, declineCall } from '@/features/call/services/callService';

export function CallNotification({ onAccept, onDecline }) {
  const [incomingCall, setIncomingCall] = useState(null);
  const user = getCurrentUser();
  const callStatusUnsubscribeRef = useRef(null);
  const autoDismissTimeoutRef = useRef(null);

  // Clear any existing timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
    };
  }, []);

  // Subscribe to notifications to listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToNotifications((notifications) => {
      // Filter for unread, ringing call notifications that are valid
      const validCalls = notifications.filter(notif => 
        notif && 
        !notif.read && 
        (notif.type === 'video_call' || notif.type === 'audio_call') && 
        notif.status === 'ringing'
      );

      if (validCalls.length > 0) {
        // Use the most recent call
        const latestCall = validCalls[0];
        
        // Additional validation to prevent ghost notifications
        if (isCallNotificationValid(latestCall)) {
          setIncomingCall(latestCall);
        } else {
          setIncomingCall(null);
        }
      } else {
        // No valid calls, clear the current one
        setIncomingCall(null);
      }
    });

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      // Clean up call status listener if it exists
      if (callStatusUnsubscribeRef.current) {
        callStatusUnsubscribeRef.current();
        callStatusUnsubscribeRef.current = null;
      }
      // Clear any timeouts
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
    };
  }, [user]);

  // Validate if a call notification is legitimate
  const isCallNotificationValid = (call) => {
    if (!call) return false;
    
    // Check if it's too old (older than 30 seconds)
    const now = Date.now();
    let timestampMs;
    
    try {
      if (call.timestamp?.toDate) {
        timestampMs = call.timestamp.toDate().getTime();
      } else if (typeof call.timestamp === 'string') {
        timestampMs = new Date(call.timestamp).getTime();
      } else if (call.timestamp instanceof Date) {
        timestampMs = call.timestamp.getTime();
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
    
    // If older than 30 seconds, it's not valid
    if (now - timestampMs > 30000) {
      return false;
    }
    
    // Check if it's for the current user
    if (call.calleeUid && call.calleeUid !== user.uid) {
      return false;
    }
    
    return true;
  };

  const handleAccept = async () => {
    if (incomingCall && onAccept) {
      try { 
        await markNotificationAsRead(incomingCall); 
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
      
      // If this is a video call with a callId, clean up call status listener
      if (incomingCall.type === 'video_call' && incomingCall.callId) {
        // Clean up any existing listener
        if (callStatusUnsubscribeRef.current) {
          callStatusUnsubscribeRef.current();
          callStatusUnsubscribeRef.current = null;
        }
      }
      
      // Pass the call data to the handler
      onAccept(incomingCall);
      
      // Immediately clear the call to dismiss the popup
      setIncomingCall(null);
    }
  };

  const handleDecline = async () => {
    if (incomingCall) {
      try { 
        await markNotificationAsRead(incomingCall); 
        
        // If this is a video call with a callId, notify the caller that the call was declined
        if (incomingCall.type === 'video_call' && incomingCall.callId) {
          await declineCall(incomingCall.callId);
        }
      } catch (error) {
        console.error('Error marking notification as read or declining call:', error);
      }
      
      // Pass the call data to the handler if provided
      if (onDecline) {
        onDecline(incomingCall);
      }
      
      // Immediately clear the call to dismiss the popup
      setIncomingCall(null);
      
      // Auto-dismiss after a short delay to ensure state is cleared
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
      autoDismissTimeoutRef.current = setTimeout(() => {
        setIncomingCall(null);
      }, 100);
    }
  };

  // Auto-dismiss popup if call status changes to non-ringing
  useEffect(() => {
    if (incomingCall && incomingCall.callId) {
      // Track if we've already dismissed the call
      let isDismissed = false;
      
      const unsubscribe = listenForCallStatus(incomingCall.callId, (data) => {
        console.log('Incoming call status changed:', data); // Debug log
        
        // Skip if already dismissed
        if (isDismissed) {
          return;
        }
        
        // If the call is no longer ringing or has ended, dismiss the popup
        if (data.status !== 'ringing' || data.status === 'ended' || data.status === 'declined') {
          isDismissed = true;
          setIncomingCall(null);
          // Clean up the listener
          if (callStatusUnsubscribeRef.current) {
            callStatusUnsubscribeRef.current();
            callStatusUnsubscribeRef.current = null;
          }
        }
      });
      
      callStatusUnsubscribeRef.current = unsubscribe;
      
      return () => {
        isDismissed = true;
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, [incomingCall]);

  // Auto-dismiss popup after 30 seconds if not handled
  useEffect(() => {
    if (incomingCall) {
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
      
      autoDismissTimeoutRef.current = setTimeout(() => {
        setIncomingCall(null);
      }, 30000); // 30 seconds
    }
    
    return () => {
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
    };
  }, [incomingCall]);

  if (!incomingCall) {
    return null;
  }

  // Additional validation before rendering
  if (!isCallNotificationValid(incomingCall)) {
    return null;
  }

  const popup = (
    <div
      className="fixed top-4 right-4 z-[2147483647] w-80 bg-card border rounded-xl shadow-lg pointer-events-auto touch-manipulation select-none"
      role="dialog"
      aria-label="Incoming call"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {incomingCall.type === 'video_call' ? (
              <div className="bg-blue-500 rounded-full p-2">
                <Video className="h-5 w-5 text-white" />
              </div>
            ) : (
              <div className="bg-green-500 rounded-full p-2">
                <Phone className="h-5 w-5 text-white" />
              </div>
            )}
            <div>
              <h3 className="font-semibold">
                {incomingCall.callerName || 'Unknown Caller'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {incomingCall.type === 'video_call' ? 'Video call' : 'Audio call'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onTouchStart={(e) => { e.preventDefault(); handleDecline(); }}
            onTouchEnd={(e) => { e.preventDefault(); }}
            onPointerUp={(e) => { e.preventDefault(); handleDecline(); }}
            onClick={handleDecline}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Caller profile picture */}
        <div className="flex justify-center my-4">
          <div className="relative">
            {incomingCall.callerPhotoURL ? (
              <img 
                src={incomingCall.callerPhotoURL} 
                alt={incomingCall.callerName || 'Caller'}
                className="w-24 h-24 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border-2 border-primary">
                <span className="text-2xl font-bold text-primary">
                  {incomingCall.callerName 
                    ? incomingCall.callerName.charAt(0).toUpperCase() 
                    : 'U'}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onTouchStart={(e) => { e.preventDefault(); handleDecline(); }}
            onTouchEnd={(e) => { e.preventDefault(); }}
            onPointerUp={(e) => { e.preventDefault(); handleDecline(); }}
            onClick={handleDecline}
            className="flex-1 py-2 px-4 bg-secondary rounded-lg hover:bg-muted cursor-pointer"
          >
            Decline
          </button>
          <button
            type="button"
            onTouchStart={(e) => { e.preventDefault(); handleAccept(); }}
            onTouchEnd={(e) => { e.preventDefault(); }}
            onPointerUp={(e) => { e.preventDefault(); handleAccept(); }}
            onClick={handleAccept}
            className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:opacity-90 cursor-pointer"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(popup, document.body);
}