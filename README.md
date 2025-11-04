# FlashChat

![FlashChat Interface](https://github.com/user-attachments/assets/fd914aa9-c7fd-44ce-a876-d723ab745085)

FlashChat is a modern real-time communication platform built with React, Firebase, and WebRTC. It provides instant messaging and audio/video calling capabilities with a focus on user experience and performance.

## Features

- 🔐 **Google Authentication**: Secure sign-in with Google accounts
- 💬 **Real-time Messaging**: Instant messaging with real-time updates
- 📞 **Audio/Video Calling**: High-quality WebRTC-based calling
- 👥 **Friend Management**: Add friends, send requests, and manage connections
- 🟢 **Online Status**: See when your friends are online
- 🌙 **Dark/Light Theme**: Toggle between dark and light modes
- 📱 **Responsive Design**: Works on mobile, tablet, and desktop
- 🔍 **User Search**: Find and connect with other users

## Tech Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Hosting)
- **Real-time Communication**: WebRTC
- **UI Components**: Radix UI, Lucide React
- **State Management**: React Hooks, Context API
- **Testing**: Jest, React Testing Library
- **Deployment**: Firebase Hosting

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/flashchat.git
   cd flashchat
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Configure Firebase:
   - Create a Firebase project at https://console.firebase.google.com/
   - Register your app and get the configuration
   - Update `src/config/firebase.js` with your Firebase config

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open your browser to http://localhost:5173

## Project Structure

```
src/
├── app/                    # App-level configuration and layout
├── features/               # Feature-based modules
│   ├── auth/              # Authentication functionality
│   ├── chat/              # Chat functionality
│   ├── call/              # Call functionality
│   └── user/              # User management
├── shared/                # Shared utilities and components
├── config/                # Configuration files
└── assets/                # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

## Documentation

For detailed documentation, please see:

- [Architecture](docs/architecture.md)
- [API Documentation](docs/api.md)
- [Coding Standards](docs/coding-standards.md)
- [Testing Guide](docs/testing.md)
- [Deployment Guide](docs/deployment.md)
- [Component Documentation](docs/)
  - [Chat Service](docs/chat-service.md)
  - [User Service](docs/user-service.md)
  - [Call Service](docs/call-service.md)
  - [useCall Hook](docs/use-call-hook.md)
  - [useChat Hook](docs/use-chat-hook.md)
  - [ConversationList Component](docs/conversation-list-component.md)

## Testing

FlashChat includes comprehensive tests:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test src/features/chat/hooks/__tests__/useChat.test.js
```

## Deployment

To deploy to Firebase Hosting:

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase project:
   ```bash
   firebase init
   ```

4. Build and deploy:
   ```bash
   npm run build
   firebase deploy
   ```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Firebase](https://firebase.google.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)