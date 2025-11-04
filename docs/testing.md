# FlashChat Testing Documentation

## Overview
This document outlines the testing strategy, tools, and best practices for the FlashChat application. The goal is to ensure code quality, reliability, and maintainability through comprehensive testing.

## Testing Philosophy
FlashChat follows a testing pyramid approach:
1. **Unit Tests** (70%): Test individual functions and components in isolation
2. **Integration Tests** (20%): Test interactions between modules and services
3. **End-to-End Tests** (10%): Test complete user workflows

## Testing Tools

### Unit Testing
- **Jest**: JavaScript testing framework
- **React Testing Library**: React component testing utilities
- **react-hooks-testing-library**: Custom hook testing utilities

### Integration Testing
- **Jest**: For service layer testing
- **Firebase Mocks**: For testing Firebase interactions

### End-to-End Testing
- **Cypress**: Browser automation testing (planned)

### Code Coverage
- **Istanbul**: Code coverage reporting through Jest
- Target: 80%+ coverage for critical functionality

## Test Organization

### File Structure
```
src/
├── features/
│   ├── chat/
│   │   ├── components/
│   │   │   └── __tests__/
│   │   ├── hooks/
│   │   │   └── __tests__/
│   │   └── services/
│   │       └── __tests__/
│   └── user/
│       ├── components/
│       │   └── __tests__/
│       ├── hooks/
│       │   └── __tests__/
│       └── services/
│           └── __tests__/
└── shared/
    ├── components/
    │   └── __tests__/
    └── hooks/
        └── __tests__/
```

### Naming Convention
- Test files: `filename.test.js`
- Test descriptions: Clear, descriptive sentences
- Test functions: `it('should do something', () => {...})`

## Unit Testing Guidelines

### Component Testing

#### Testing Props
```javascript
import { render, screen } from '@testing-library/react';
import { UserProfile } from '../user-profile';

describe('UserProfile', () => {
  const mockUser = {
    name: 'John Doe',
    email: 'john@example.com',
    photoURL: 'https://example.com/avatar.jpg'
  };

  it('should display user information correctly', () => {
    render(<UserProfile user={mockUser} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByAltText('John Doe')).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });
});
```

#### Testing User Interactions
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageInput } from '../message-input';

describe('MessageInput', () => {
  it('should call onSubmit when form is submitted', () => {
    const mockSubmit = jest.fn((e) => e.preventDefault());
    render(<MessageInput onSubmit={mockSubmit} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    const form = screen.getByRole('form');
    
    fireEvent.change(input, { target: { value: 'Hello World' } });
    fireEvent.submit(form);
    
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });
});
```

#### Testing State Changes
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleButton } from '../toggle-button';

describe('ToggleButton', () => {
  it('should toggle state when clicked', () => {
    render(<ToggleButton />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Off');
    
    fireEvent.click(button);
    expect(button).toHaveTextContent('On');
    
    fireEvent.click(button);
    expect(button).toHaveTextContent('Off');
  });
});
```

### Hook Testing

#### Testing Custom Hooks
```javascript
import { renderHook, act } from '@testing-library/react-hooks';
import { useChat } from '../useChat';

describe('useChat', () => {
  it('should initialize with empty messages', () => {
    const { result } = renderHook(() => useChat(mockSelectedChat));
    
    expect(result.current.messages).toEqual([]);
    expect(result.current.message).toBe('');
  });
  
  it('should update message text', () => {
    const { result } = renderHook(() => useChat(mockSelectedChat));
    
    act(() => {
      result.current.setMessage('Hello World');
    });
    
    expect(result.current.message).toBe('Hello World');
  });
});
```

### Service Testing

#### Testing Async Functions
```javascript
import { sendMessage } from '../chatService';

// Mock Firebase
jest.mock('@/config/firebase', () => ({
  db: {
    collection: jest.fn(),
    addDoc: jest.fn()
  }
}));

describe('ChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const mockDocRef = { id: 'doc123' };
      addDoc.mockResolvedValue(mockDocRef);
      
      const messageData = { text: 'Hello World' };
      const result = await sendMessage(messageData, 'recipient123');
      
      expect(result).toBe('doc123');
      expect(addDoc).toHaveBeenCalled();
    });
    
    it('should handle errors gracefully', async () => {
      addDoc.mockRejectedValue(new Error('Network error'));
      
      const messageData = { text: 'Hello World' };
      const result = await sendMessage(messageData, 'recipient123');
      
      expect(result).toBeNull();
    });
  });
});
```

## Integration Testing Guidelines

### Service Integration
```javascript
import { searchFriends } from '../userService';

describe('UserService Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should return friends matching search query', async () => {
    // Mock Firebase interactions
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ friends: ['friend1', 'friend2'] })
    });
    
    getDocs.mockResolvedValue({
      forEach: (callback) => {
        callback({
          data: () => ({ 
            uid: 'friend1', 
            name: 'John Doe',
            email: 'john@example.com'
          })
        });
        callback({
          data: () => ({ 
            uid: 'friend2', 
            name: 'Jane Smith',
            email: 'jane@example.com'
          })
        });
      }
    });
    
    const result = await searchFriends('john');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('John Doe');
  });
});
```

## End-to-End Testing Guidelines

### User Workflows
```javascript
// Example Cypress test (planned implementation)
describe('User Authentication Flow', () => {
  it('should allow user to sign in and send a message', () => {
    // Visit the app
    cy.visit('/');
    
    // Sign in with Google
    cy.contains('Sign in with Google').click();
    
    // Mock Google authentication
    cy.origin('https://accounts.google.com', () => {
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('button').contains('Next').click();
      // ... continue with authentication flow
    });
    
    // Verify user is signed in
    cy.contains('Welcome, Test User');
    
    // Select a friend to chat with
    cy.contains('John Doe').click();
    
    // Send a message
    cy.get('textarea[placeholder="Type a message..."]').type('Hello, John!');
    cy.get('button').contains('Send').click();
    
    // Verify message was sent
    cy.contains('Hello, John!');
  });
});
```

## Mocking Strategies

### Firebase Mocking
```javascript
// Mock Firebase services
jest.mock('@/config/firebase', () => ({
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    onSnapshot: jest.fn()
  },
  auth: {
    onAuthStateChanged: jest.fn()
  }
}));
```

### Service Mocking
```javascript
// Mock imported services
jest.mock('@/features/user/services/userService', () => ({
  getCurrentUser: jest.fn(),
  subscribeToFriends: jest.fn()
}));
```

## Test Coverage

### Coverage Goals
- **Critical Services**: 90%+ coverage
- **UI Components**: 80%+ coverage
- **Hooks**: 85%+ coverage
- **Utilities**: 95%+ coverage

### Coverage Reporting
```bash
# Run tests with coverage
npm test -- --coverage

# Generate coverage report
npm test -- --coverage --coverageReporters=text-summary
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Check coverage
        run: npm test -- --coverage --coverageReporters=text-summary
```

## Best Practices

### 1. Test Realistic Scenarios
```javascript
// Good: Test both success and error cases
it('should handle network errors gracefully', async () => {
  fetch.mockRejectedValueOnce(new Error('Network error'));
  
  const { result } = renderHook(() => useApi());
  
  await act(async () => {
    await result.current.fetchData();
  });
  
  expect(result.current.error).toBe('Network error');
  expect(result.current.loading).toBe(false);
});
```

### 2. Use Descriptive Test Names
```javascript
// Good: Clear, descriptive test name
it('should filter friends based on search query', () => {
  // Implementation
});

// Avoid: Vague test name
it('should work', () => {
  // Implementation
});
```

### 3. Keep Tests Independent
```javascript
// Good: Each test is independent
beforeEach(() => {
  jest.clearAllMocks();
});

it('should return empty array for empty query', () => {
  // Test implementation
});

it('should return matching results for valid query', () => {
  // Test implementation (not affected by previous test)
});
```

### 4. Test Edge Cases
```javascript
describe('searchFriends', () => {
  it('should handle empty search query', async () => {
    const result = await searchFriends('');
    expect(result).toEqual([]);
  });
  
  it('should handle null current user', async () => {
    global.currentUser = null;
    const result = await searchFriends('john');
    expect(result).toEqual([]);
  });
  
  it('should handle special characters in search', async () => {
    // Test with special characters
  });
  
  it('should handle case insensitive search', async () => {
    // Test case insensitivity
  });
});
```

## Test Maintenance

### Keeping Tests Up-to-Date
1. Update tests when modifying functionality
2. Remove obsolete tests when removing features
3. Refactor tests when refactoring code
4. Regularly review test coverage reports

### Handling Test Failures
1. Identify the root cause of failures
2. Fix the underlying issue or update the test
3. Run related tests to ensure no regressions
4. Update documentation if behavior changes

## Performance Considerations

### Test Execution Speed
1. Use focused tests during development (`it.only`, `describe.only`)
2. Parallelize test execution when possible
3. Mock expensive operations
4. Use setup/teardown efficiently

### Memory Management
1. Clean up mocks between tests
2. Unmount components properly
3. Clear timeouts and intervals
4. Reset global state between tests

This testing strategy ensures that FlashChat maintains high quality and reliability as it evolves and grows.