import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  createCallDocument,
  rtcConfiguration,
  offerCandidatesCollection,
  answerCandidatesCollection,
  addIceCandidate,
  listenForIceCandidates,
  listenForOffer,
  listenForAnswer,
  listenForCallStatus,
  setOffer,
  setAnswer,
  endCall as endCallService,
  cleanupCallData,
  updateCallStatus
} from '@/features/call/services/callService';
import { getCurrentUser } from '@/features/user/services/userService';

/**
 * Custom hook for managing WebRTC-based audio and video calls
 * @param {Object} selectedChat - The selected chat user object
 * @param {string} role - The role of the current user in the call ('caller' or 'callee')
 * @returns {Object} - Call state and functions
 */
export const useCall = (selectedChat, role = 'caller') => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isRemoteVideoConnected, setIsRemoteVideoConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callStatus, setCallStatus] = useState('Initializing...');
  const [callDuration, setCallDuration] = useState(0);
  const [remoteUser, setRemoteUser] = useState(null);
  const [error, setError] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const unsubscribersRef = useRef([]);
  const cleanupTimeoutRef = useRef(null);
  const hasEndedRef = useRef(false);
  const pendingRemoteStreamRef = useRef(null);
  const remoteStreamAppliedRef = useRef(false);
  const callTimerRef = useRef(null);
  const hasHandledOfferRef = useRef(false);
  const hasHandledAnswerRef = useRef(false);
  const iceCandidateQueueRef = useRef([]);
  const isProcessingIceQueueRef = useRef(false);
  
  const user = getCurrentUser();

  // Call duration timer
  useEffect(() => {
    if (callStatus === 'Call in progress') {
      const startTime = Date.now();
      callTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setCallDuration(elapsed);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callStatus]);

  /**
   * Format call duration in MM:SS or HH:MM:SS format
   * @param {number} seconds - Duration in seconds
   * @returns {string} - Formatted time string
   */
  const formatCallDuration = useCallback((seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Toggle mute state of local audio track
   */
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  /**
   * Toggle enabled state of local video track
   */
  const toggleVideo = useCallback(() => {
    setIsVideoOff(prev => !prev);
    
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOff;
      });
    }
  }, [isVideoOff]);

  /**
   * Start a call to the selected chat user
   * @returns {Promise<void>}
   */
  const startCall = useCallback(async () => {
    if (!selectedChat) {
      setError('No chat selected');
      return;
    }
    
    try {
      setCallStatus('Creating call...');
      
      // Create call document in Firestore
      const callId = await createCallDocument(user.uid, selectedChat.uid);
      
      // Set remote user
      setRemoteUser(selectedChat);
      
      setCallStatus('Initializing connection...');
      setIsCallActive(true);
    } catch (err) {
      console.error('Error starting call:', err);
      setError(err.message || 'Failed to start call');
      setCallStatus('Failed to start call');
    }
  }, [selectedChat, user?.uid]);

  /**
   * End the current call
   * @param {boolean} remoteEnded - Whether the call was ended by the remote party
   * @returns {Promise<void>}
   */
  const endCall = useCallback(async (remoteEnded = false) => {
    if (hasEndedRef.current) return;
    
    hasEndedRef.current = true;
    setIsCallActive(false);
    setCallStatus(remoteEnded ? 'Call ended by other party' : 'Call ended');
    
    // Cleanup media
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Cleanup peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Cleanup listeners
    unsubscribersRef.current.forEach(unsubscribe => {
      if (unsubscribe) unsubscribe();
    });
    unsubscribersRef.current = [];
    
    // Clear timeouts
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }
    
    // Clear call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
  }, []);

  /**
   * Accept an incoming call
   * @returns {Promise<void>}
   */
  const acceptCall = useCallback(async () => {
    if (!selectedChat) {
      setError('No chat selected');
      return;
    }
    
    try {
      setCallStatus('Accepting call...');
      setIsCallActive(true);
      setCallStatus('Call in progress');
    } catch (err) {
      console.error('Error accepting call:', err);
      setError(err.message || 'Failed to accept call');
      setCallStatus('Failed to accept call');
    }
  }, [selectedChat]);

  /**
   * Decline an incoming call
   * @returns {Promise<void>}
   */
  const declineCall = useCallback(async () => {
    try {
      setCallStatus('Declining call...');
      // In a real implementation, you would notify the caller
      setTimeout(() => {
        endCall();
      }, 1000);
    } catch (err) {
      console.error('Error declining call:', err);
      setError(err.message || 'Failed to decline call');
      endCall();
    }
  }, [endCall]);

  return {
    // State
    isCallActive,
    isRemoteVideoConnected,
    isMuted,
    isVideoOff,
    isScreenSharing,
    callStatus,
    callDuration,
    remoteUser,
    error,
    
    // Refs
    localVideoRef,
    remoteVideoRef,
    localStreamRef,
    peerConnectionRef,
    
    // Functions
    toggleMute,
    toggleVideo,
    startCall,
    endCall,
    acceptCall,
    declineCall,
    formatCallDuration
  };
};