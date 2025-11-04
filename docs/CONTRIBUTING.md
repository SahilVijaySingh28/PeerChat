# Contributing to FlashChat

## Code Style and Formatting

### JavaScript/JSX
- Use camelCase for variables and functions
- Use PascalCase for components and classes
- Use UPPER_SNAKE_CASE for constants
- Use kebab-case for file names
- Follow Airbnb JavaScript Style Guide
- Use Prettier for code formatting

### CSS/Styling
- Use Tailwind CSS classes when possible
- Use CSS modules for component-specific styles
- Use kebab-case for CSS class names

## Project Structure

Follow the feature-based modular architecture:
- Place feature-specific code in `src/features/[feature-name]/`
- Place shared code in `src/shared/`
- Follow the established directory structure

## Component Development

### Functional Components
- Use functional components with hooks instead of class components
- Use PropTypes for type checking
- Extract complex logic into custom hooks
- Keep components focused on a single responsibility

### Component Structure
```jsx
import React from 'react';
import PropTypes from 'prop-types';

// Component definition
const ComponentName = ({ prop1, prop2 }) => {
  // Component logic here
  
  return (
    // JSX here
  );
};

// PropTypes
ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
};

// Default props
ComponentName.defaultProps = {
  prop2: 0,
};

export default ComponentName;
```

## Service Development

### API Services
- Create service files for API calls
- Handle errors appropriately
- Return consistent data structures
- Use async/await for asynchronous operations

### Utility Functions
- Place in `src/shared/utils/`
- Keep functions pure when possible
- Write unit tests for utility functions
- Document complex functions with JSDoc

## Testing

### Unit Tests
- Write tests for components and utility functions
- Use React Testing Library for component tests
- Use Jest for unit tests
- Aim for >80% code coverage

### Integration Tests
- Test interactions between components and services
- Test API integrations
- Test state management flows

### Test Structure
```
// Import statements
import { render, screen } from '@testing-library/react';
import ComponentName from './ComponentName';

// Describe block
describe('ComponentName', () => {
  // Test cases
  test('should render correctly', () => {
    // Test implementation
    render(<ComponentName />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });
});
```

## Git Workflow

### Branch Naming
- Use descriptive branch names
- Prefix with feature/, bugfix/, or hotfix/
- Example: feature/user-authentication, bugfix/login-error

### Commit Messages
- Use conventional commit format
- Start with a type (feat, fix, chore, docs, etc.)
- Use present tense
- Be descriptive but concise
- Example: "feat: add user authentication flow"

### Pull Requests
- Create PRs for all changes
- Include a descriptive title and description
- Link to related issues
- Request reviews from team members
- Ensure all tests pass before merging

## Documentation

### Code Documentation
- Use JSDoc for functions and components
- Comment complex logic
- Update README files when making significant changes

### Feature Documentation
- Document new features in the docs/ directory
- Include usage examples
- Explain configuration options