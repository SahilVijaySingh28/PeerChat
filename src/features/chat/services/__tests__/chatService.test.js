import { sendMessage, subscribeToMessages } from '../chatService';

// Mock Firestore
jest.mock('@/config/firebase', () => ({
  db: {
    collection: jest.fn(),
    addDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    onSnapshot: jest.fn()
  },
  handleFirestoreError: jest.fn()
}));

// Mock user service
jest.mock('@/features/user/services/userService', () => ({
  getCurrentUser: jest.fn()
}));

import { getCurrentUser } from '@/features/user/services/userService';
import { addDoc, onSnapshot } from '@/config/firebase';

describe('Chat Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      // Mock current user
      getCurrentUser.mockReturnValue({
        uid: 'user123',
        displayName: 'Test User',
        photoURL: 'test.jpg'
      });

      // Mock Firestore addDoc
      const mockDocRef = { id: 'doc123' };
      addDoc.mockResolvedValue(mockDocRef);

      // Test data
      const messageData = {
        text: 'Hello World',
        name: 'Test User',
        photoURL: 'test.jpg',
        you: true
      };
      const recipientId = 'recipient456';

      // Call function
      const result = await sendMessage(messageData, recipientId);

      // Assertions
      expect(result).toBe('doc123');
      expect(addDoc).toHaveBeenCalledWith(
        expect.any(Object), // collection reference
        expect.objectContaining({
          text: 'Hello World',
          userId: 'user123',
          recipientId: 'recipient456',
          name: 'Test User',
          photoURL: 'test.jpg'
        })
      );
    });

    it('should return null when user is not authenticated', async () => {
      // Mock no current user
      getCurrentUser.mockReturnValue(null);

      // Test data
      const messageData = { text: 'Hello World' };
      const recipientId = 'recipient456';

      // Call function
      const result = await sendMessage(messageData, recipientId);

      // Assertions
      expect(result).toBeNull();
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('should return null when recipient ID is missing', async () => {
      // Mock current user
      getCurrentUser.mockReturnValue({
        uid: 'user123'
      });

      // Test data
      const messageData = { text: 'Hello World' };
      const recipientId = null;

      // Call function
      const result = await sendMessage(messageData, recipientId);

      // Assertions
      expect(result).toBeNull();
      expect(addDoc).not.toHaveBeenCalled();
    });
  });

  describe('subscribeToMessages', () => {
    it('should subscribe to messages and return unsubscribe function', () => {
      // Mock current user
      getCurrentUser.mockReturnValue({
        uid: 'user123'
      });

      // Mock Firestore onSnapshot
      const mockUnsubscribe = jest.fn();
      onSnapshot.mockImplementation((query, callback, errorCallback) => {
        // Simulate calling the callback with mock data
        callback({
          forEach: (fn) => {
            fn({
              id: 'msg1',
              data: () => ({
                text: 'Hello',
                userId: 'user123',
                recipientId: 'recipient456',
                timestamp: { toDate: () => new Date() }
              })
            });
          }
        });
        return mockUnsubscribe;
      });

      // Test callback
      const mockCallback = jest.fn();

      // Call function
      const unsubscribe = subscribeToMessages('recipient456', mockCallback);

      // Assertions
      expect(typeof unsubscribe).toBe('function');
      expect(mockCallback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'msg1',
            text: 'Hello',
            you: true
          })
        ])
      );
    });

    it('should return empty array when no user is authenticated', () => {
      // Mock no current user
      getCurrentUser.mockReturnValue(null);

      // Test callback
      const mockCallback = jest.fn();

      // Call function
      const unsubscribe = subscribeToMessages('recipient456', mockCallback);

      // Assertions
      expect(typeof unsubscribe).toBe('function');
      expect(mockCallback).toHaveBeenCalledWith([]);
    });

    it('should return empty array when no recipient ID is provided', () => {
      // Mock current user
      getCurrentUser.mockReturnValue({
        uid: 'user123'
      });

      // Test callback
      const mockCallback = jest.fn();

      // Call function
      const unsubscribe = subscribeToMessages(null, mockCallback);

      // Assertions
      expect(typeof unsubscribe).toBe('function');
      expect(mockCallback).toHaveBeenCalledWith([]);
    });
  });
});