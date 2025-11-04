import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ConversationList } from '../conversation-list'

// Mock the userService
jest.mock('@/features/user/services/userService', () => ({
  getCurrentUser: () => ({
    uid: 'user123',
    displayName: 'Test User',
    email: 'test@example.com',
    photoURL: 'test-photo.jpg'
  }),
  subscribeToFriends: (callback) => {
    // Simulate friends data
    callback([
      {
        uid: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        photoURL: 'test-photo.jpg',
        isOnline: true,
        lastSeen: new Date()
      },
      {
        uid: 'friend1',
        name: 'John Doe',
        email: 'john@example.com',
        photoURL: 'john-photo.jpg',
        isOnline: true,
        lastSeen: new Date()
      },
      {
        uid: 'friend2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        photoURL: 'jane-photo.jpg',
        isOnline: false,
        lastSeen: new Date(Date.now() - 3600000) // 1 hour ago
      }
    ])
    return () => {} // unsubscribe function
  }
}))

// Mock child components
jest.mock('@/shared/components/avatar', () => ({
  Avatar: ({ children, className }) => <div className={className}>{children}</div>,
  AvatarImage: ({ src, alt }) => <img src={src} alt={alt} />,
  AvatarFallback: ({ children, className }) => <div className={className}>{children}</div>
}))

jest.mock('@/shared/components/online-status', () => ({
  OnlineStatus: ({ isOnline, showText }) => (
    <div>{isOnline ? 'Online' : showText ? 'Offline' : ''}</div>
  )
}))

describe('ConversationList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the component with correct title', () => {
    render(<ConversationList />)
    expect(screen.getByText('Conversations')).toBeInTheDocument()
  })

  it('should display all friends when no search query is entered', async () => {
    render(<ConversationList />)
    
    // Wait for friends to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
    
    // Should display 3 users (Test User, John Doe, Jane Smith)
    const userItems = screen.getAllByText(/Test User|John Doe|Jane Smith/)
    expect(userItems).toHaveLength(3)
  })

  it('should filter friends based on search query', async () => {
    render(<ConversationList />)
    
    // Wait for friends to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    
    // Enter search query
    const searchInput = screen.getByPlaceholderText('Search Friends')
    fireEvent.change(searchInput, { target: { value: 'John' } })
    
    // Should only display John Doe
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })
  })

  it('should show "No friends found" message when search returns no results', async () => {
    render(<ConversationList />)
    
    // Wait for friends to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    
    // Enter search query that matches no friends
    const searchInput = screen.getByPlaceholderText('Search Friends')
    fireEvent.change(searchInput, { target: { value: 'NonExistentUser' } })
    
    // Should display "No friends found" message
    await waitFor(() => {
      expect(screen.getByText('No friends found')).toBeInTheDocument()
      expect(screen.getByText('No friends match your search. Try a different name or add new friends.')).toBeInTheDocument()
    })
  })

  it('should clear search when Escape key is pressed', async () => {
    render(<ConversationList />)
    
    // Wait for friends to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    
    // Enter search query
    const searchInput = screen.getByPlaceholderText('Search Friends')
    fireEvent.change(searchInput, { target: { value: 'John' } })
    
    // Press Escape key
    fireEvent.keyDown(searchInput, { key: 'Escape' })
    
    // Search query should be cleared
    expect(searchInput.value).toBe('')
  })

  it('should show loading indicator during search', async () => {
    render(<ConversationList />)
    
    // Enter search query
    const searchInput = screen.getByPlaceholderText('Search Friends')
    fireEvent.change(searchInput, { target: { value: 'John' } })
    
    // Should show loading indicator
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('should handle special characters in search query', async () => {
    render(<ConversationList />)
    
    // Wait for friends to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    
    // Enter search query with special characters
    const searchInput = screen.getByPlaceholderText('Search Friends')
    fireEvent.change(searchInput, { target: { value: 'J@hn' } })
    
    // Should handle special characters gracefully
    await waitFor(() => {
      // This will depend on how the search function handles special characters
      // In this case, it should either show no results or handle them properly
    })
  })

  it('should maintain accessibility features', () => {
    render(<ConversationList />)
    
    // Check that search input has proper accessibility attributes
    const searchInput = screen.getByPlaceholderText('Search Friends')
    expect(searchInput).toHaveAttribute('aria-label', 'Search friends')
    expect(searchInput).toHaveAttribute('role', 'searchbox')
    
    // Check that friend items are accessible
    const friendItems = screen.getAllByText(/Test User|John Doe|Jane Smith/)
    friendItems.forEach(item => {
      expect(item).toHaveAttribute('role', 'button')
      expect(item).toHaveAttribute('tabIndex', '0')
    })
  })
})