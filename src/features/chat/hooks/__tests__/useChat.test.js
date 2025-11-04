import { renderHook, act } from '@testing-library/react-hooks';
import { useChat } from '../useChat';
import * as chatService from '@/features/chat/services/chatService';
import * as userService from '@/features/user/services/userService';

// Mock the services
jest.mock('@/features/chat/services/chatService');
jest.mock('@/features/user/services/userService');

describe('useChat Hook', () => {
  const mockSelectedChat = {
    uid: 'recipient123',
    name: 'Test User'
  };

  const mockUser = {
    uid: 'user123',
    displayName: 'Current User'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    userService.getCurrentUser.mockReturnValue(mockUser);
  });

  it('should initialize with empty messages and empty message text', () => {
    const { result } = renderHook(() => useChat(mockSelectedChat));

    expect(result.current.messages).toEqual([]);
    expect(result.current.message).toBe('');
    expect(result.current.isSending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should update message text when setMessage is called', () => {
    const { result } = renderHook(() => useChat(mockSelectedChat));

    act(() => {
      result.current.setMessage('Hello World');
    });

    expect(result.current.message).toBe('Hello World');
  });

  it('should send message successfully', async () => {
    const { result } = renderHook(() => useChat(mockSelectedChat));
    
    // Mock sendMessage to resolve successfully
    chatService.sendMessage.mockResolvedValue('doc123');

    // Set message text
    act(() => {
      result.current.setMessage('Hello World');
    });

    // Send message
    await act(async () => {
      await result.current.handleSendMessage({ preventDefault: jest.fn() });
    });

    // Assertions
    expect(chatService.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Hello World',
        name: 'Current User'
      }),
      'recipient123'
    );
    expect(result.current.message).toBe('');
    expect(result.current.isSending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle send message error', async () => {
    const { result } = renderHook(() => useChat(mockSelectedChat));
    
    // Mock sendMessage to reject with error
    chatService.sendMessage.mockRejectedValue(new Error('Network error'));

    // Set message text
    act(() => {
      result.current.setMessage('Hello World');
    });

    // Send message
    await act(async () => {
      await result.current.handleSendMessage({ preventDefault: jest.fn() });
    });

    // Assertions
    expect(result.current.message).toBe('Hello World'); // Message should not be cleared on error
    expect(result.current.isSending).toBe(false);
    expect(result.current.error).toBe('Network error');
  });

  it('should not send empty message', async () => {
    const { result } = renderHook(() => useChat(mockSelectedChat));
    
    // Set empty message
    act(() => {
      result.current.setMessage('');
    });

    // Try to send message
    await act(async () => {
      await result.current.handleSendMessage({ preventDefault: jest.fn() });
    });

    // Assertions
    expect(chatService.sendMessage).not.toHaveBeenCalled();
  });
});