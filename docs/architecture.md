# FlashChat Architecture Documentation

## Overview
FlashChat is a real-time communication platform built with React, Firebase, and WebRTC. It provides instant messaging and audio/video calling capabilities with a focus on user experience and performance.

## Technology Stack

### Frontend
- **React 19**: UI library for building the user interface
- **Vite 7**: Build tool for fast development and production builds
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library
- **Radix UI**: Accessible UI primitives

### Backend & Infrastructure
- **Firebase**:
  - Authentication: Google Sign-In
  - Firestore: Real-time database for user data, messages, and call signaling
  - Hosting: Web application hosting

### Real-time Communication
- **WebRTC**: Peer-to-peer audio/video communication
- **STUN/TURN Servers**: NAT traversal for WebRTC connections

## Project Structure

```
src/
├── app/                    # App-level configuration and layout
├── features/               # Feature-based modules
│   ├── auth/              # Authentication functionality
│   │   ├── components/    # Authentication UI components
│   │   └── services/      # Authentication business logic
│   ├── chat/              # Chat functionality
│   │   ├── components/    # Chat UI components
│   │   ├── hooks/         # Chat-related React hooks
│   │   └── services/      # Chat business logic
│   ├── call/              # Call functionality
│   │   ├── components/    # Call UI components
│   │   ├── hooks/         # Call-related React hooks
│   │   └── services/      # Call business logic
│   └── user/              # User management
│       ├── components/    # User UI components
│       ├── hooks/         # User-related React hooks
│       └── services/      # User business logic
├── shared/                # Shared utilities and components
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Reusable React hooks
│   └── utils/             # Utility functions
├── config/                # Configuration files
└── assets/                # Static assets
```

## Feature Modules

### Authentication (`src/features/auth/`)
Handles user authentication with Google Sign-In.

**Components:**
- Login interface

**Services:**
- Authentication service with signInWithGoogle and signOut functions

### Chat (`src/features/chat/`)
Manages instant messaging functionality.

**Components:**
- Conversation list: Displays user conversations
- Chat thread: Message display and input interface

**Hooks:**
- useChat: Manages chat state and message sending

**Services:**
- Chat service: Handles message sending and subscription to message streams

### Call (`src/features/call/`)
Manages WebRTC-based audio and video calling.

**Components:**
- Audio call: Audio-only call interface
- Video call: Video call interface with local/remote video streams
- Call notification: Incoming call notification UI

**Hooks:**
- useCall: Manages call state, media streams, and WebRTC connections

**Services:**
- Call service: Handles WebRTC signaling through Firestore

### User (`src/features/user/`)
Manages user profiles, friends, and online status.

**Components:**
- Left rail: Main navigation
- Right sidebar: User directory and friend requests

**Hooks:**
- useOnlineStatus: Tracks and displays user online status
- useUser: Manages user-related state

**Services:**
- User service: Handles user data, friend management, and search functionality

## Shared Modules

### Components (`src/shared/components/`)
Reusable UI components used across features:
- Avatar: User profile pictures
- Online status: Online/offline indicators

### Hooks (`src/shared/hooks/`)
Reusable React hooks:
- useNotifications: Manages user notifications
- useTheme: Handles light/dark theme switching

### Utils (`src/shared/utils/`)
Utility functions:
- Error handling
- Media utilities for WebRTC
- Time formatting
- General utility functions

## Data Flow

### Authentication Flow
1. User clicks "Sign in with Google"
2. Firebase Authentication handles OAuth flow
3. UserService creates user document in Firestore if it doesn't exist
4. User data is stored in both Firebase Auth and Firestore

### Chat Flow
1. ConversationList subscribes to user's friends list
2. User selects a friend to chat with
3. ChatThread subscribes to messages between users
4. User types and sends a message
5. ChatService sends message to Firestore
6. Firestore triggers onSnapshot listeners
7. New message appears in both users' chat interfaces

### Call Flow
1. User initiates a call to another user
2. CallService creates call document in Firestore
3. Notification is sent to callee
4. Callee accepts the call
5. WebRTC offer/answer exchange through Firestore
6. ICE candidate exchange through Firestore
7. Peer-to-peer connection established
8. Media streams are displayed in UI
9. Call ends and Firestore data is cleaned up

## State Management

FlashChat uses a combination of approaches for state management:

1. **React State Hooks**: Local component state for UI elements
2. **Custom Hooks**: Encapsulated state logic for specific features
3. **Context API**: Global state for theme and authentication
4. **Firebase Real-time Listeners**: Server state synchronization

## Testing Strategy

### Unit Testing
- Jest for testing JavaScript functions
- React Testing Library for testing components
- Mock Firebase services for isolation

### Integration Testing
- Test service functions with mocked dependencies
- Test hook behavior with react-hooks-testing-library

### End-to-End Testing
- Cypress for browser automation testing
- Test user flows from authentication to messaging to calling

## Performance Considerations

1. **Code Splitting**: Lazy loading of feature modules
2. **Bundle Optimization**: Tree-shaking and minification
3. **Caching**: Firestore offline persistence
4. **Debouncing**: Search functionality to reduce API calls
5. **Efficient Queries**: Indexed Firestore queries for performance

## Security Measures

1. **Authentication**: Firebase Authentication with Google Sign-In
2. **Authorization**: Firestore security rules
3. **Data Validation**: Client and server-side validation
4. **Rate Limiting**: Call rate limiting to prevent abuse
5. **Privacy Controls**: User-controlled online status visibility

## Deployment

1. **Development**: `npm run dev` for local development
2. **Build**: `npm run build` for production builds
3. **Deployment**: Firebase Hosting
4. **CI/CD**: GitHub Actions for automated testing and deployment

## Future Enhancements

1. **Push Notifications**: Firebase Cloud Messaging for offline notifications
2. **Group Chats**: Multi-user conversation support
3. **File Sharing**: Media and document sharing capabilities
4. **Message Encryption**: End-to-end encryption for messages
5. **Call Recording**: Audio/video call recording functionality
6. **Custom Emojis**: Emoji picker and custom emoji support
7. **Themes**: Multiple color themes and customization options