# useCall Hook Documentation

## Overview
The `useCall` hook manages the state and functionality for WebRTC-based audio and video calls in FlashChat. It handles media streams, peer connections, call status, and UI state.

## Usage

```javascript
import { useCall } from '@/features/call/hooks/useCall';

function CallComponent({ selectedChat }) {
  const {
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
  } = useCall(selectedChat);
  
  // Render UI using the provided state and functions
}
```

## State Properties

### isCallActive
(Boolean) Whether a call is currently active.

### isRemoteVideoConnected
(Boolean) Whether the remote video stream is connected.

### isMuted
(Boolean) Whether the local audio is muted.

### isVideoOff
(Boolean) Whether the local video is turned off.

### isScreenSharing
(Boolean) Whether screen sharing is active.

### callStatus
(String) Current status of the call (e.g., 'Initializing...', 'Call in progress').

### callDuration
(Number) Duration of the call in seconds.

### remoteUser
(Object) User object representing the remote party in the call.

### error
(String|null) Error message if an error occurred.

## Refs

### localVideoRef
(Ref) Reference to the local video element.

### remoteVideoRef
(Ref) Reference to the remote video element.

### localStreamRef
(Ref) Reference to the local media stream.

### peerConnectionRef
(Ref) Reference to the RTCPeerConnection object.

## Functions

### toggleMute()
Toggles the mute state of the local audio track.

### toggleVideo()
Toggles the enabled state of the local video track.

### startCall()
Initiates a call to the selected chat user.

### endCall()
Ends the current call.

### acceptCall()
Accepts an incoming call.

### declineCall()
Declines an incoming call.

### formatCallDuration(seconds)
Formats call duration in MM:SS or HH:MM:SS format.

**Parameters:**
- `seconds` (Number): Duration in seconds

**Returns:**
- Formatted time string

## Implementation Details

The hook manages several aspects of WebRTC calling:

1. **Media Stream Management**: Handles local and remote media streams
2. **Peer Connection**: Manages the RTCPeerConnection lifecycle
3. **Call State**: Tracks call status, duration, and participant information
4. **UI State**: Manages mute, video, and screen sharing toggles
5. **Error Handling**: Captures and exposes errors to the UI
6. **Cleanup**: Ensures proper cleanup of resources when calls end

## Best Practices

1. Always clean up resources by calling `endCall()` when the component unmounts
2. Use the provided refs to attach video streams to video elements
3. Handle errors appropriately in the UI
4. Respect the user's mute/video preferences
5. Implement proper loading states using `callStatus`