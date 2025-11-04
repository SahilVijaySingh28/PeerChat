import { useState, useEffect, useRef } from 'react';
import { Phone, Mic, MicOff, Video, VideoOff, X, Monitor, MonitorOff } from 'lucide-react';
import { getCurrentUser, getUserById } from '@/features/user/services/userService';
import {
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

export function VideoCall({ selectedChat, onClose, onCallEnd, role = 'caller', callId }) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isRemoteVideoConnected, setIsRemoteVideoConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [callDuration, setCallDuration] = useState(0);
  const [remoteUser, setRemoteUser] = useState(null); // Store remote user data
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const unsubscribersRef = useRef([]);
  const cleanupTimeoutRef = useRef(null);
  const hasEndedRef = useRef(false);
  // Store remote stream temporarily if ref is not available yet
  const pendingRemoteStreamRef = useRef(null);
  // Track if we've already applied the remote stream
  const remoteStreamAppliedRef = useRef(false);
  // Call timer ref
  const callTimerRef = useRef(null);
  
  // Track offer handling to prevent duplicates
  const hasHandledOfferRef = useRef(false);
  // Track answer handling to prevent duplicates
  const hasHandledAnswerRef = useRef(false);
  // Track ICE candidate processing
  const iceCandidateQueueRef = useRef([]);
  const isProcessingIceQueueRef = useRef(false);
  
  const user = getCurrentUser();
  // Use remote user name if available, otherwise fallback to selectedChat or default
  const chatTitle = remoteUser 
    ? remoteUser.name || remoteUser.displayName || remoteUser.email || "Unknown User"
    : (selectedChat 
        ? selectedChat.name 
        : "FlashChat");

  // Fetch remote user data based on role
  useEffect(() => {
    const fetchRemoteUserData = async () => {
      try {
        if (callId) {
          // Listen to call document to get caller/callee info
          const { listenForCallStatus } = await import('@/features/call/services/callService');
          const unsubscribe = listenForCallStatus(callId, async (data) => {
            console.log('Call status changed:', data);
            
            // Check if call has ended
            if (data && (data.status === 'ended' || (data.endedAt && data.endedAt !== null))) {
              console.log('Call ended detected, closing call');
              setCallStatus('Call ended by other party');
              setTimeout(() => {
                endCall(true);
              }, 1000);
              return;
            }
            
            if (data && (data.callerUid || data.calleeUid)) {
              // Determine remote user ID based on role
              let remoteUserId;
              if (role === 'caller' && data.calleeUid) {
                remoteUserId = data.calleeUid;
              } else if (role === 'callee' && data.callerUid) {
                remoteUserId = data.callerUid;
              }
              
              // Fetch remote user data
              if (remoteUserId && remoteUserId !== user?.uid) {
                const userData = await getUserById(remoteUserId);
                if (userData) {
                  setRemoteUser(userData);
                }
              }
            }
          });
          
          unsubscribersRef.current.push(unsubscribe);
        } else if (selectedChat) {
          // For caller, use selectedChat as remote user
          setRemoteUser(selectedChat);
        }
      } catch (error) {
        console.error('Error fetching remote user data:', error);
        // Fallback to selectedChat if available
        if (selectedChat) {
          setRemoteUser(selectedChat);
        }
      }
    };
    
    fetchRemoteUserData();
  }, [callId, role, selectedChat, user?.uid]);

  // Initialize media devices and set up signaling
  useEffect(() => {
    startCall();
    
    // Listen for call ended event from socket
    const handleCallEnded = (data) => {
      console.log('Received call ended event:', data);
      setCallStatus('Call ended by other party');
      setTimeout(() => {
        endCall(true);
      }, 2000);
    };
    
    // Add socket listener if socket is available
    if (window.socket) {
      window.socket.on('call_ended', handleCallEnded);
    }
    
    // Cleanup function
    return () => {
      console.log('Cleaning up VideoCall component');
      cleanupMedia();
      cleanupListeners();
      // Clear any pending cleanup timeouts
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      
      // Clear call timer
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      
      // Remove socket listener
      if (window.socket) {
        window.socket.off('call_ended', handleCallEnded);
      }
    };
  }, []);

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

  // Format call duration
  const formatCallDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Apply pending remote stream when remoteVideoRef becomes available
  useEffect(() => {
    if (remoteVideoRef.current && pendingRemoteStreamRef.current) {
      console.log('Applying pending remote stream to video element');
      applyRemoteStreamToVideoElement(pendingRemoteStreamRef.current);
      pendingRemoteStreamRef.current = null;
    }
  }, [remoteVideoRef.current]);

  // Ensure video element is properly sized after component mounts
  useEffect(() => {
    if (remoteVideoRef.current) {
      const videoElement = remoteVideoRef.current;
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.style.objectFit = 'cover';
    }
  }, []);

  // Function to apply remote stream to video element with proper error handling
  const applyRemoteStreamToVideoElement = (stream) => {
    // Prevent applying the same stream multiple times
    if (remoteStreamAppliedRef.current) {
      console.log('Remote stream already applied, skipping');
      return;
    }
    
    if (remoteVideoRef.current) {
      console.log('Applying remote stream to video element');
      
      // Set the stream to the video element
      try {
        remoteVideoRef.current.srcObject = stream;
        
        // Configure video element properties
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.autoplay = true;
        remoteVideoRef.current.playsInline = true;
        remoteVideoRef.current.controls = false;
        
        // Force play the video
        const playPromise = remoteVideoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Remote video play successful');
              setIsRemoteVideoConnected(true);
            })
            .catch(error => {
              console.log('Error playing remote video:', error);
              // Even if play fails, we still want to show the video element
              setIsRemoteVideoConnected(true);
            });
        } else {
          // Fallback for browsers that don't return a promise
          setIsRemoteVideoConnected(true);
        }
        
        // Mark that we've applied the stream
        remoteStreamAppliedRef.current = true;
        
        // Add event listeners for better UX
        remoteVideoRef.current.onloadedmetadata = () => {
          console.log('Remote video metadata loaded');
          if (remoteVideoRef.current) {
            console.log('Video dimensions:', remoteVideoRef.current.videoWidth, 'x', remoteVideoRef.current.videoHeight);
          }
        };
        
        remoteVideoRef.current.onplay = () => {
          console.log('Remote video started playing');
          console.log('Video playing state:', remoteVideoRef.current?.paused, remoteVideoRef.current?.ended);
          setIsRemoteVideoConnected(true);
        };
        
        // Handle video pause event
        remoteVideoRef.current.onpause = () => {
          console.log('Remote video paused');
          // Try to play it again
          if (remoteVideoRef.current) {
            remoteVideoRef.current.play().catch(error => {
              console.log('Error re-playing remote video:', error);
            });
          }
        };
        
        // Handle video errors
        remoteVideoRef.current.onerror = (error) => {
          console.error('Remote video error:', error);
        };
        
        // Handle video load start
        remoteVideoRef.current.onloadstart = () => {
          console.log('Remote video load started');
        };
        
        // Handle video can play
        remoteVideoRef.current.oncanplay = () => {
          console.log('Remote video can play');
        };
        
        // Handle video waiting (buffering)
        remoteVideoRef.current.onwaiting = () => {
          console.log('Remote video waiting/buffering');
        };
      } catch (error) {
        console.error('Error applying remote stream to video element:', error);
        // Even if there's an error, we still want to show the video element
        setIsRemoteVideoConnected(true);
      }
    } else {
      // Store stream temporarily if ref is not available yet
      console.log('Remote video ref not available yet, storing stream temporarily');
      pendingRemoteStreamRef.current = stream;
    }
  };

  // Function to handle local stream
  const handleLocalStream = (stream) => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localStreamRef.current = stream;
      
      // Configure video element properties
      localVideoRef.current.muted = true;
      localVideoRef.current.autoplay = true;
      localVideoRef.current.playsInline = true;
      localVideoRef.current.controls = false;
      
      // Force play the local video
      const playPromise = localVideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Local video play successful');
          })
          .catch(error => {
            console.log('Error playing local video:', error);
          });
      }
      
      // Handle video pause event for local video
      localVideoRef.current.onpause = () => {
        console.log('Local video paused');
        // Try to play it again
        if (localVideoRef.current) {
          localVideoRef.current.play().catch(error => {
            console.log('Error re-playing local video:', error);
          });
        }
      };
    }
  };

  // Function to toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Function to toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Function to toggle screen share
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: true
        });
        
        if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
          // Replace video track in peer connection
          const videoSender = peerConnectionRef.current.getSenders().find(sender => 
            sender.track?.kind === 'video'
          );
          
          if (videoSender) {
            const screenTrack = screenStream.getVideoTracks()[0];
            await videoSender.replaceTrack(screenTrack);
            
            // Listen for when screen sharing stops
            screenTrack.onended = () => {
              setIsScreenSharing(false);
              // Restore camera stream
              if (localStreamRef.current) {
                const cameraTrack = localStreamRef.current.getVideoTracks()[0];
                videoSender.replaceTrack(cameraTrack);
              }
            };
            
            setIsScreenSharing(true);
          }
        }
      } else {
        // Stop screen sharing
        const screenTrack = localStreamRef.current?.getVideoTracks()[0];
        if (screenTrack) {
          screenTrack.stop();
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      alert('Failed to toggle screen share. Please try again.');
    }
  };

  // Function to clean up media resources
  const cleanupMedia = () => {
    console.log('Cleaning up media resources');
    
    // Stop local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      localStreamRef.current = null;
    }
    
    // Clear video srcObjects
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current) {
      console.log('Clearing remote video srcObject');
      remoteVideoRef.current.srcObject = null;
      setIsRemoteVideoConnected(false);
      remoteStreamAppliedRef.current = false;
    }
    
    // Close peer connection
    if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
      console.log('Closing peer connection');
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  // Function to clean up listeners
  const cleanupListeners = () => {
    console.log('Cleaning up listeners');
    
    // Unsubscribe from all Firestore listeners
    unsubscribersRef.current.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    unsubscribersRef.current = [];
  };

  // Function to end call
  const endCall = async (endedByRemote = false) => {
    // Prevent multiple calls to endCall
    if (hasEndedRef.current) {
      console.log('Call already ended, skipping');
      return;
    }
    
    hasEndedRef.current = true;
    console.log('Ending call, endedByRemote:', endedByRemote);
    
    // Update UI immediately
    setCallStatus(endedByRemote ? 'Call ended by other party' : 'Call ended');
    
    // Clean up resources
    cleanupMedia();
    cleanupListeners();
    
    // Only update Firestore if we're the one ending the call
    if (!endedByRemote && callId) {
      console.log('Notifying other party that call has ended');
      try {
        // Update call status to ended
        await updateCallStatus(callId, 'ended');
        
        // Clean up call data
        await cleanupCallData(callId);
      } catch (error) {
        console.error('Error updating call status:', error);
      }
    }
    
    // Notify parent component after a short delay to ensure UI updates
    setTimeout(() => {
      if (onCallEnd) {
        console.log('Notifying parent component that call ended via onCallEnd');
        onCallEnd();
      }
      if (onClose) {
        console.log('Notifying parent component that call ended via onClose');
        onClose();
      }
    }, 100);
  };

  // Process ICE candidate queue
  const processIceCandidateQueue = async () => {
    if (isProcessingIceQueueRef.current || iceCandidateQueueRef.current.length === 0) {
      return;
    }
    
    isProcessingIceQueueRef.current = true;
    
    try {
      while (iceCandidateQueueRef.current.length > 0) {
        const candidate = iceCandidateQueueRef.current.shift();
        
        if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('Added remote ICE candidate successfully');
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        }
      }
    } finally {
      isProcessingIceQueueRef.current = false;
    }
  };

  // Function to start call
  const startCall = async () => {
    try {
      console.log('Starting call with role:', role);
      
      // Get local media stream
      const constraints = { 
        video: { 
          frameRate: 30,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: true 
      };
      
      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Local stream info:', {
        id: localStream.id,
        tracks: localStream.getTracks(),
        videoTracks: localStream.getVideoTracks(),
        audioTracks: localStream.getAudioTracks(),
        videoTrackEnabled: localStream.getVideoTracks()[0]?.enabled
      });
      
      handleLocalStream(localStream);
      
      // Create peer connection
      const pc = new RTCPeerConnection(rtcConfiguration);
      peerConnectionRef.current = pc;
      
      // Add local stream to peer connection
      localStream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind, track.id);
        pc.addTrack(track, localStream);
      });
      
      // Set up ICE candidate handling
      pc.onicecandidate = async (event) => {
        if (event.candidate && callId) {
          console.log('Sending ICE candidate:', event.candidate);
          try {
            // Fix: Pass the correct parameters to addIceCandidate
            if (role === 'caller') {
              await addIceCandidate(offerCandidatesCollection(callId), event.candidate);
            } else {
              await addIceCandidate(answerCandidatesCollection(callId), event.candidate);
            }
            console.log('ICE candidate added to Firestore successfully');
          } catch (err) {
            console.error('Error sending ICE candidate:', err);
            // Don't show alert for ICE candidate errors as they're often non-fatal
          }
        }
      };
      
      // Set up track handling for remote stream
      pc.ontrack = (event) => {
        console.log('Remote track received:', event);
        console.log('Remote stream info:', {
          id: event.streams[0]?.id,
          tracks: event.streams[0]?.getTracks(),
          videoTracks: event.streams[0]?.getVideoTracks(),
          audioTracks: event.streams[0]?.getAudioTracks(),
          videoTrackEnabled: event.streams[0]?.getVideoTracks()[0]?.enabled
        });
        
        // Apply remote stream to video element
        if (event.streams && event.streams[0]) {
          applyRemoteStreamToVideoElement(event.streams[0]);
        }
      };
      
      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state changed:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsCallActive(true);
          setCallStatus('Call in progress');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setCallStatus('Connection failed');
          setTimeout(() => {
            endCall();
          }, 3000);
        }
      };
      
      // Handle signaling state changes
      pc.onsignalingstatechange = () => {
        console.log('Signaling state changed:', pc.signalingState);
      };
      
      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state changed:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          setCallStatus('Connection failed');
          setTimeout(() => {
            endCall();
          }, 3000);
        }
      };
      
      // If we're the caller, create offer
      if (role === 'caller' && callId) {
        console.log('Creating offer for caller');
        setCallStatus('Ringing...');
        
        // Listen for answer with duplicate prevention
        const unsubAnswer = listenForAnswer(callId, async (answer) => {
          // Prevent handling the same answer multiple times
          if (hasHandledAnswerRef.current) {
            console.log('Answer already handled, skipping');
            return;
          }
          
          try {
            hasHandledAnswerRef.current = true;
            
            if (!pc || pc.signalingState === 'closed') {
              console.log('Peer connection is closed, skipping answer handling');
              return;
            }
            
            console.log('Received answer:', answer);
            if (pc.signalingState !== 'have-local-offer') {
              console.log('Invalid signaling state for setting remote description:', pc.signalingState);
              return;
            }
            
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            setCallStatus('Call in progress');
            await updateCallStatus(callId, 'accepted');
            console.log('Set remote description from answer');
          } catch (err) {
            console.error('Error handling answer', err);
            setCallStatus('Failed to connect');
          }
        });
        unsubscribersRef.current.push(unsubAnswer);
        
        // Listen for callee ICE with queue processing
        const unsubAnsCand = listenForIceCandidates(answerCandidatesCollection(callId), async (c) => {
          try {
            console.log('Received remote ICE candidate (caller):', c);
            if (!peerConnectionRef.current) return;
            
            // Add to queue and process
            iceCandidateQueueRef.current.push(c);
            await processIceCandidateQueue();
          } catch (err) {
            console.error('Error handling answer ICE candidate:', err);
          }
        });
        unsubscribersRef.current.push(unsubAnsCand);
        
        // Create and send offer
        const offer = await pc.createOffer();
        console.log('Created local offer:', offer);
        await pc.setLocalDescription(offer);
        await setOffer(callId, { sdp: offer.sdp, type: offer.type });
        console.log('Set local description from offer');
      } 
      // If we're the callee, listen for offer
      else if (role === 'callee' && callId) {
        console.log('Listening for offer as callee');
        setCallStatus('Ringing...');
        
        // Listen for offer with duplicate prevention
        const unsubOffer = listenForOffer(callId, async (offer) => {
          // Prevent handling the same offer multiple times
          if (hasHandledOfferRef.current) {
            console.log('Offer already handled, skipping');
            return;
          }
          
          try {
            hasHandledOfferRef.current = true;
            
            if (!pc || pc.signalingState === 'closed') {
              console.log('Peer connection is closed, skipping offer handling');
              return;
            }
            
            console.log('Received remote offer:', offer);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            if (pc.signalingState !== 'have-remote-offer') {
              console.log('Invalid signaling state for creating answer:', pc.signalingState);
              return;
            }
            
            const answer = await pc.createAnswer();
            console.log('Created local answer:', answer);
            
            if (pc.signalingState !== 'have-remote-offer') {
              console.log('Invalid signaling state for setting local description:', pc.signalingState);
              return;
            }
            
            await pc.setLocalDescription(answer);
            await setAnswer(callId, { sdp: answer.sdp, type: answer.type });
            setCallStatus('Call in progress');
            await updateCallStatus(callId, 'accepted');
            console.log('Set local description from answer');
          } catch (err) {
            console.error('Error handling offer', err);
            setCallStatus('Failed to connect');
          }
        });
        unsubscribersRef.current.push(unsubOffer);

        // Listen for caller ICE with queue processing
        const unsubOffCand = listenForIceCandidates(offerCandidatesCollection(callId), async (c) => {
          try {
            console.log('Received remote ICE candidate (callee):', c);
            if (!peerConnectionRef.current) return;
            
            // Add to queue and process
            iceCandidateQueueRef.current.push(c);
            await processIceCandidateQueue();
          } catch (err) {
            console.error('Error handling offer ICE candidate:', err);
          }
        });
        unsubscribersRef.current.push(unsubOffCand);
      }
    } catch (error) {
      console.error('Error starting call:', error);
      setCallStatus('Failed to start call');
      setTimeout(() => {
        endCall();
      }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-2 safe-area-top safe-area-bottom">
      <div className="w-full max-w-4xl h-[90vh] bg-card rounded-2xl border border-gray-700 flex flex-col shadow-2xl">
        {/* Call header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <div className="min-w-0 flex-1">
            <h3 className="text-responsive-lg font-semibold truncate">{chatTitle}</h3>
            <div className="flex items-center gap-2">
              <p className="text-responsive-sm text-muted-foreground truncate">{callStatus}</p>
              {callStatus === 'Call in progress' && (
                <span className="text-responsive-sm font-medium text-green-500">
                  {formatCallDuration(callDuration)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Video area - responsive layout */}
        <div className="flex-1 relative flex flex-col md:flex-row gap-2 p-2 overflow-hidden">
          {/* Remote video or recipient info during ringing */}
          <div className="flex-1 w-full md:w-2/3 bg-muted rounded-xl overflow-hidden relative shadow-lg">
            {/* Remote video element */}
            <video 
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full ${isRemoteVideoConnected ? 'block' : 'hidden'}`}
              style={{ objectFit: 'cover' }}
            />
          
            {/* Show profile placeholder when video is not connected */}
            {!isRemoteVideoConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                <div className="bg-secondary rounded-full w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center mb-4 border-2 border-primary/30">
                  {(remoteUser?.photoURL || selectedChat?.photoURL) ? (
                    <img 
                      src={remoteUser?.photoURL || selectedChat?.photoURL} 
                      alt={chatTitle} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-responsive-xl sm:text-responsive-2xl font-bold">
                      {chatTitle?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <h2 className="text-responsive-lg sm:text-responsive-xl font-semibold mb-2 text-center px-2">{chatTitle}</h2>
                <p className="text-muted-foreground mb-4 text-center px-4 text-responsive-sm">
                  {callStatus === 'Ringing...' ? 'Calling...' : callStatus}
                </p>
                <div className="flex items-center justify-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mx-1 animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full mx-1 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full mx-1 animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            )}
          </div>

          {/* Local video */}
          <div className="w-full md:w-1/3 bg-muted rounded-xl overflow-hidden relative shadow-lg">
            <video 
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                <VideoOff className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
              </div>
            )}
            
            {/* Local video label for better UX */}
            <div className="absolute top-2 left-2 bg-black/50 text-white text-responsive-xs px-2 py-1 rounded-lg">
              You
            </div>
          </div>
        </div>

        {/* Call controls - improved responsive layout */}
        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center justify-center gap-4 md:gap-6">
            <button
              onClick={toggleMute}
              className={`flex flex-col items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full ${isMuted ? 'bg-destructive' : 'bg-secondary'} hover:opacity-90 transition-all`}
              aria-label={isMuted ? "Unmute" : "Mute"}>
              {isMuted ? (
                <>
                  <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-[8px] sm:text-[10px] mt-1">Unmute</span>
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-[8px] sm:text-[10px] mt-1">Mute</span>
                </>
              )}
            </button>
            
            <button
              onClick={toggleVideo}
              className={`flex flex-col items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full ${isVideoOff ? 'bg-destructive' : 'bg-secondary'} hover:opacity-90 transition-all`}
              aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}>
              {isVideoOff ? (
                <>
                  <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-[8px] sm:text-[10px] mt-1">Video Off</span>
                </>
              ) : (
                <>
                  <Video className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-[8px] sm:text-[10px] mt-1">Video On</span>
                </>
              )}
            </button>
            
            <button
              onClick={toggleScreenShare}
              className={`flex flex-col items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full ${isScreenSharing ? 'bg-primary' : 'bg-secondary'} hover:opacity-90 transition-all`}
              aria-label={isScreenSharing ? "Stop screen share" : "Start screen share"}>
              {isScreenSharing ? (
                <>
                  <MonitorOff className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-[8px] sm:text-[10px] mt-1">Stop Share</span>
                </>
              ) : (
                <>
                  <Monitor className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-[8px] sm:text-[10px] mt-1">Share Screen</span>
                </>
              )}
            </button>
            
            <button
              onClick={() => endCall()}
              className="flex flex-col items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-destructive hover:bg-destructive/90 transition-all"
              aria-label="End call">
              <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              <span className="text-[8px] sm:text-[10px] mt-1 text-white">End</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}