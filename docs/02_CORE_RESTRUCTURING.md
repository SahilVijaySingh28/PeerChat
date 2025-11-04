# Phase 2: Core Restructuring

## Overview

This document outlines the core restructuring phase for the FlashChat application, focusing on organizing the codebase according to the new feature-based modular architecture.

## Current Structure Analysis

### Components Directory
The current `src/components/` directory contains:
- UI components (`left-rail.jsx`, `conversation-list.jsx`, `chat-thread.jsx`, `right-sidebar.jsx`)
- Call components (`audio-call.jsx`, `video-call.jsx`, `call-notification.jsx`)
- UI primitives (`ui/avatar.jsx`, `ui/online-status.jsx`)

### Lib Directory
The current `src/lib/` directory contains:
- Firebase configuration (`firebase.js`)
- User service (`userService.js`) - Contains auth, user management, and online status functionality
- Chat service (`chatService.js`) - Contains message sending/receiving functionality
- Call service (`callService.js`) - Contains WebRTC calling functionality
- Utilities (`utils.js`)

## Proposed Restructuring Plan

### 1. Move Shared Components
- `src/components/ui/avatar.jsx` → `src/shared/components/avatar.jsx`
- `src/components/ui/online-status.jsx` → `src/shared/components/online-status.jsx`

### 2. Create Feature Directories

#### Auth Feature
- Move auth-related functionality from `userService.js` to `src/features/auth/`
- Create `src/features/auth/services/authService.js`
- Create `src/features/auth/components/Login.jsx` (from `src/components/login.jsx`)

#### Chat Feature
- Move chat-related functionality from `chatService.js` to `src/features/chat/`
- Move chat components from `src/components/` to `src/features/chat/components/`
- Create `src/features/chat/services/chatService.js`
- Move `src/components/conversation-list.jsx` → `src/features/chat/components/ConversationList.jsx`
- Move `src/components/chat-thread.jsx` → `src/features/chat/components/ChatThread.jsx`

#### User Feature
- Move user-related functionality from `userService.js` to `src/features/user/`
- Create `src/features/user/services/userService.js`
- Move `src/components/left-rail.jsx` → `src/features/user/components/LeftRail.jsx`
- Move `src/components/right-sidebar.jsx` → `src/features/user/components/RightSidebar.jsx`

#### Call Feature
- Move call-related functionality from `callService.js` to `src/features/call/`
- Move call components from `src/components/` to `src/features/call/components/`
- Create `src/features/call/services/callService.js`
- Move `src/components/audio-call.jsx` → `src/features/call/components/AudioCall.jsx`
- Move `src/components/video-call.jsx` → `src/features/call/components/VideoCall.jsx`
- Move `src/components/call-notification.jsx` → `src/features/call/components/CallNotification.jsx`

### 3. Configuration
- Move `src/lib/firebase.js` → `src/config/firebase.js`
- Create `src/config/constants.js` for application constants

### 4. Utilities
- Move `src/lib/utils.js` → `src/shared/utils/utils.js`

## Implementation Steps

1. Create the new directory structure (completed in Phase 1)
2. Identify and move shared components
3. Create feature directories and move related code
4. Update import paths throughout the application
5. Test functionality after each move
6. Update documentation

## Timeline Estimate

- Shared components: 1 hour
- Auth feature: 2 hours
- Chat feature: 3 hours
- User feature: 3 hours
- Call feature: 4 hours
- Configuration and utilities: 1 hour
- Import path updates: 2 hours
- Testing and validation: 2 hours

Total estimated time: 18 hours

## Backward Compatibility Considerations

- Maintain existing APIs during transition
- Use aliases or wrapper functions if needed
- Gradually deprecate old patterns
- Ensure no breaking changes for end users

## Next Steps

Proceed with moving shared components to the shared directory.