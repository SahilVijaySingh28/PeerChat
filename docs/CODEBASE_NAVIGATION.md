# FlashChat Codebase Navigation Guide

## Overview

This guide explains how to navigate the FlashChat codebase, which follows a feature-based modular architecture.

## Finding Components

### Feature-Specific Components
- Located in `src/features/[feature-name]/components/`
- Example: Chat components are in `src/features/chat/components/`

### Shared Components
- Located in `src/shared/components/`
- Used across multiple features

## Finding Services

### Feature-Specific Services
- Located in `src/features/[feature-name]/services/`
- Example: Auth services are in `src/features/auth/services/`

### Shared Services
- Located in `src/shared/services/`
- Used across multiple features

## Finding Hooks

### Feature-Specific Hooks
- Located in `src/features/[feature-name]/hooks/`
- Example: User hooks are in `src/features/user/hooks/`

### Shared Hooks
- Located in `src/shared/hooks/`
- Used across multiple features

## Finding Utilities

- Located in `src/shared/utils/`
- Contains helper functions used throughout the application

## Finding Constants

- Located in `src/shared/constants/`
- Contains application-wide constants

## Finding Configuration

- Located in `src/config/`
- Contains configuration files like Firebase setup and theme configuration

## Finding Tests

### Unit Tests
- Located in `tests/unit/`
- Mirrors the structure of `src/` directory

### Integration Tests
- Located in `tests/integration/`

### End-to-End Tests
- Located in `tests/e2e/`

## Adding New Features

1. Create a new directory in `src/features/`
2. Follow the standard feature structure:
   - `components/` for UI components
   - `services/` for business logic
   - `hooks/` for custom hooks
3. Place shared functionality in `src/shared/` directories