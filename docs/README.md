# FlashChat Project Structure Documentation

## Overview

This document provides an overview of the FlashChat application's project structure, following a feature-based modular architecture to improve maintainability, scalability, and readability.

## Directory Structure

```
flashchat/
├── src/
│   ├── app/                     # Application entry point and routing
│   │   ├── routes/              # Route definitions
│   │   ├── App.jsx              # Main application component
│   │   └── main.jsx             # Application entry point
│   ├── features/                # Feature-based modules
│   │   ├── auth/                # Authentication feature
│   │   │   ├── components/      # Auth-specific components
│   │   │   ├── services/        # Auth-specific services
│   │   │   ├── hooks/           # Auth-specific hooks
│   │   │   └── authSlice.js     # Auth state management
│   │   ├── chat/                # Chat feature
│   │   │   ├── components/      # Chat-specific components
│   │   │   ├── services/        # Chat-specific services
│   │   │   ├── hooks/           # Chat-specific hooks
│   │   │   └── chatSlice.js     # Chat state management
│   │   └── user/                # User feature
│   │       ├── components/      # User-specific components
│   │       ├── services/        # User-specific services
│   │       ├── hooks/           # User-specific hooks
│   │       └── userSlice.js     # User state management
│   ├── shared/                  # Shared resources across features
│   │   ├── components/          # Reusable UI components
│   │   ├── hooks/               # Reusable custom hooks
│   │   ├── services/            # Shared services
│   │   ├── utils/               # Utility functions
│   │   └── constants/           # Application constants
│   ├── assets/                  # Static assets
│   │   ├── images/
│   │   ├── icons/
│   │   └── styles/
│   └── config/                  # Configuration files
│       ├── firebase.js          # Firebase configuration
│       ├── theme.js             # Theme configuration
│       └── constants.js         # Global constants
├── public/                      # Public static assets
├── backend/                     # Backend services (if applicable)
├── tests/                       # Test files
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── e2e/                     # End-to-end tests
├── docs/                        # Documentation
├── bug_db/                      # Bug reports and fixes
└── scripts/                     # Build and utility scripts
```

## Getting Started

This structure organizes the codebase by features, making it easier to navigate and maintain. Each feature contains all related components, services, and hooks in a single location.

## Contributing

Please follow the structure and naming conventions outlined in this document when adding new features or modifying existing code.