# FlashChat Coding Standards

## Overview
This document outlines the coding standards and best practices for the FlashChat project. Following these standards ensures code consistency, maintainability, and readability across the codebase.

## General Principles

### 1. Code Organization
- Follow the feature-based folder structure
- Keep files focused on a single responsibility
- Use meaningful and descriptive names for files, functions, and variables
- Group related functionality together

### 2. Modularity
- Prefer functional components over class components
- Extract reusable logic into custom hooks
- Create small, focused functions
- Avoid deeply nested code

### 3. Performance
- Use React.memo for components that render frequently
- Implement useCallback and useMemo for expensive computations
- Optimize re-renders by memoizing props
- Use code splitting for large features

## JavaScript/React Standards

### Naming Conventions
- **Variables/Functions**: camelCase (`userName`, `getUserData`)
- **Components**: PascalCase (`UserProfile`, `ChatThread`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_MESSAGE_LENGTH`)
- **Files**: kebab-case (`user-profile.jsx`, `chat-service.js`)

### Component Structure
```javascript
// Import statements at the top
import React, { useState, useEffect } from 'react';
import { SomeComponent } from '@/shared/components/some-component';

// Component definition
export function MyComponent({ prop1, prop2 }) {
  // State declarations
  const [state, setState] = useState(initialValue);
  
  // Ref declarations
  const ref = useRef(null);
  
  // Memoized values
  const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
  
  // Callback functions
  const handleClick = useCallback(() => {
    // Implementation
  }, []);
  
  // Effects
  useEffect(() => {
    // Side effects
    return () => {
      // Cleanup
    };
  }, []);
  
  // Render
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

### Hook Usage
1. **Custom Hooks**: Extract reusable logic into custom hooks
2. **Hook Naming**: Prefix with `use` (`useChat`, `useCall`)
3. **Hook Rules**: Follow React's rules of hooks
4. **Hook Documentation**: Document parameters and return values

### Error Handling
```javascript
// Good: Proper error handling with try/catch
async function fetchUserData(userId) {
  try {
    const response = await api.getUser(userId);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    // Handle error appropriately
    throw new Error('User data fetch failed');
  }
}

// Component with error boundary pattern
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUserData(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!user) return <div>User not found</div>;
  
  return <UserDetails user={user} />;
}
```

## Testing Standards

### Test File Structure
- Place test files in `__tests__` directories adjacent to the code being tested
- Name test files with the same name as the source file plus `.test.js` suffix
- Organize tests by describe blocks for logical grouping

### Test Coverage
- Aim for 80%+ test coverage for critical functionality
- Test both happy paths and error cases
- Use realistic test data
- Mock external dependencies

### Test Examples
```javascript
// Example unit test
describe('UserService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  describe('searchFriends', () => {
    it('should return empty array when no search query is provided', async () => {
      const result = await searchFriends('');
      expect(result).toEqual([]);
    });
    
    it('should return matching friends based on name', async () => {
      // Mock dependencies
      global.currentUser = { uid: 'user123' };
      
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ friends: ['friend1'] })
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
        }
      });
      
      const result = await searchFriends('john');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
    });
  });
});
```

## Documentation Standards

### JSDoc Comments
Use JSDoc for documenting functions, classes, and complex logic:

```javascript
/**
 * Sends a message to a specific user
 * @param {Object} messageData - The message data to send
 * @param {string} messageData.text - The message text
 * @param {string} messageData.name - The sender's name
 * @param {string} recipientUserId - The Firebase UID of the message recipient
 * @returns {Promise<string|null>} - The document ID of the sent message, or null if failed
 */
export async function sendMessage(messageData, recipientUserId) {
  // Implementation
}
```

### Component Documentation
Document component props and usage:

```javascript
/**
 * ChatThread component displays messages and provides message input
 * @param {Object} props - Component props
 * @param {Object} props.selectedChat - The selected chat user object
 * @param {Function} props.onClose - Callback function to close the chat
 */
export function ChatThread({ selectedChat, onClose }) {
  // Implementation
}
```

## CSS/Tailwind Standards

### Class Naming
- Use Tailwind utility classes primarily
- Create reusable component classes when needed
- Follow BEM methodology for complex components

### Responsive Design
- Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`)
- Mobile-first approach
- Test on multiple screen sizes

### Example
```jsx
// Good: Responsive and accessible
<div className="flex flex-col md:flex-row gap-4 p-4 bg-card rounded-lg shadow">
  <div className="md:w-1/3">
    <img 
      src={user.photoURL} 
      alt={user.name}
      className="w-full h-auto rounded-lg"
    />
  </div>
  <div className="md:w-2/3">
    <h2 className="text-xl font-bold mb-2">{user.name}</h2>
    <p className="text-muted-foreground">{user.bio}</p>
  </div>
</div>
```

## Git Workflow

### Branching Strategy
- `main`: Production-ready code
- `develop`: Development branch
- Feature branches: `feature/feature-name`
- Hotfix branches: `hotfix/fix-name`

### Commit Messages
Follow conventional commits format:
- `feat: Add user search functionality`
- `fix: Resolve chat message timestamp issue`
- `docs: Update API documentation`
- `test: Add tests for user service`
- `refactor: Optimize message rendering`

### Pull Requests
- Create PRs for all feature work
- Include description of changes
- Link to related issues
- Request reviews from team members
- Ensure tests pass before merging

## Performance Optimization

### React Optimization
1. **Memoization**:
   ```javascript
   const expensiveValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
   const handleClick = useCallback(() => handleEvent(), []);
   ```

2. **Component Memoization**:
   ```javascript
   const MemoizedComponent = React.memo(({ data }) => {
     // Component implementation
   });
   ```

3. **Virtual Scrolling**: For long lists of messages or users

### Bundle Optimization
- Code splitting with dynamic imports
- Tree shaking unused code
- Lazy loading non-critical features

## Accessibility

### ARIA Attributes
- Use semantic HTML elements
- Add appropriate ARIA roles and properties
- Ensure keyboard navigation

### Example
```jsx
<button
  onClick={handleClick}
  aria-label="Send message"
  aria-disabled={isSending}
  className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
>
  {isSending ? 'Sending...' : 'Send'}
</button>
```

## Security Practices

### Input Validation
- Validate all user inputs
- Sanitize data before displaying
- Use parameterized queries

### Authentication
- Never store sensitive data in localStorage
- Use secure HTTP headers
- Implement proper session management

### Error Handling
- Don't expose sensitive information in error messages
- Log errors securely
- Implement rate limiting

## Code Review Guidelines

### Review Checklist
- [ ] Code follows established patterns
- [ ] Proper error handling is implemented
- [ ] Tests are included and pass
- [ ] Documentation is updated
- [ ] Performance considerations are addressed
- [ ] Security best practices are followed
- [ ] Accessibility is considered
- [ ] Code is readable and maintainable

### Common Review Comments
- "Consider extracting this logic into a custom hook"
- "This component might benefit from memoization"
- "Please add tests for this new functionality"
- "Consider adding JSDoc comments for clarity"