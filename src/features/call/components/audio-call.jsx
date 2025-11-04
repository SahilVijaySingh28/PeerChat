import { useState, useEffect, useRef } from 'react';
import { Phone, Mic, MicOff, X } from 'lucide-react';
import { getCurrentUser, sendAudioCallNotification } from '@/features/user/services/userService';

export function AudioCall({ selectedChat, onClose, onCallEnd, callId }) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState('Connecting...');
  
  const user = getCurrentUser();
  const chatTitle = selectedChat 
    ? selectedChat.name 
    : "FlashChat";

  // Initialize call and send notification
  useEffect(() => {
    startCall();
    return () => {
      endCall();
    };
  }, []);

  const startCall = async () => {
    try {
      // Send call notification to the recipient
      if (selectedChat && selectedChat.uid) {
        const callNotification = await sendAudioCallNotification(selectedChat.uid, {
          callerUid: user.uid,
          callerName: user.displayName || user.email,
          callerPhotoURL: user.photoURL
        }, callId); // Pass callId if available
        console.log('Audio call notification sent:', callNotification);
      }
      
      // Simulate call connection
      setCallStatus('Ringing...');
      setTimeout(() => {
        setIsCallActive(true);
        setCallStatus('Call in progress');
      }, 3000);
    } catch (error) {
      console.error('Error starting audio call:', error);
      setCallStatus('Failed to start call');
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const endCall = () => {
    setIsCallActive(false);
    
    // Update call status to missed if call was not connected
    if (callStatus === 'Ringing...' || callStatus === 'Connecting...') {
      setCallStatus('Call missed');
    } else {
      setCallStatus('Call ended');
    }
    
    if (onCallEnd) {
      onCallEnd();
    }
    if (onClose) {
      onClose();
    }
    
    // Close the call window after 2 seconds
    setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-xl border flex flex-col">
        {/* Call header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">{chatTitle}</h3>
            <p className="text-sm text-muted-foreground">{callStatus}</p>
          </div>
          <button
            onClick={endCall}
            className="grid h-10 w-10 place-items-center rounded-full bg-destructive hover:bg-destructive/90"
            aria-label="End call">
            <Phone className="h-5 w-5 text-white rotate-[135deg]" />
          </button>
        </div>

        {/* Call content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="bg-muted rounded-full w-32 h-32 flex items-center justify-center mb-6">
            <div className="bg-secondary rounded-full w-24 h-24 flex items-center justify-center">
              <span className="text-2xl font-bold">
                {selectedChat?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">{chatTitle}</h2>
          <p className="text-muted-foreground">
            {isCallActive ? 'Call in progress' : 'Connecting...'}
          </p>
        </div>

        {/* Call controls */}
        <div className="p-4 border-t">
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={toggleMute}
              className={`grid h-12 w-12 place-items-center rounded-full ${
                isMuted ? 'bg-destructive' : 'bg-secondary'
              } hover:opacity-90`}
              aria-label={isMuted ? "Unmute" : "Mute"}>
              {isMuted ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
            
            <button
              onClick={endCall}
              className="grid h-12 w-12 place-items-center rounded-full bg-destructive hover:bg-destructive/90"
              aria-label="End call">
              <Phone className="h-5 w-5 text-white rotate-[135deg]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}