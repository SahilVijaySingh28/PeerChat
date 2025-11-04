import { renderHook, act } from '@testing-library/react-hooks'
import { useCall } from '../useCall'
import * as callService from '@/features/call/services/callService'
import * as userService from '@/features/user/services/userService'

// Mock the services
jest.mock('@/features/call/services/callService')
jest.mock('@/features/user/services/userService')

describe('useCall Hook', () => {
  const mockSelectedChat = {
    uid: 'recipient123',
    name: 'Test User'
  }

  const mockUser = {
    uid: 'user123',
    displayName: 'Current User'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    userService.getCurrentUser.mockReturnValue(mockUser)
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useCall(mockSelectedChat))

    expect(result.current.isCallActive).toBe(false)
    expect(result.current.isRemoteVideoConnected).toBe(false)
    expect(result.current.isMuted).toBe(false)
    expect(result.current.isVideoOff).toBe(false)
    expect(result.current.isScreenSharing).toBe(false)
    expect(result.current.callStatus).toBe('Initializing...')
    expect(result.current.callDuration).toBe(0)
    expect(result.current.remoteUser).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should toggle mute state', () => {
    const { result } = renderHook(() => useCall(mockSelectedChat))

    act(() => {
      result.current.toggleMute()
    })

    expect(result.current.isMuted).toBe(true)
  })

  it('should toggle video state', () => {
    const { result } = renderHook(() => useCall(mockSelectedChat))

    act(() => {
      result.current.toggleVideo()
    })

    expect(result.current.isVideoOff).toBe(true)
  })

  it('should start call successfully', async () => {
    const { result } = renderHook(() => useCall(mockSelectedChat))
    
    // Mock createCallDocument to resolve successfully
    callService.createCallDocument.mockResolvedValue('call123')

    await act(async () => {
      await result.current.startCall()
    })

    expect(callService.createCallDocument).toHaveBeenCalledWith('user123', 'recipient123')
    expect(result.current.isCallActive).toBe(true)
    expect(result.current.remoteUser).toEqual(mockSelectedChat)
  })

  it('should handle start call error', async () => {
    const { result } = renderHook(() => useCall(mockSelectedChat))
    
    // Mock createCallDocument to reject with error
    callService.createCallDocument.mockRejectedValue(new Error('Network error'))

    await act(async () => {
      await result.current.startCall()
    })

    expect(result.current.error).toBe('Network error')
    expect(result.current.callStatus).toBe('Failed to start call')
  })

  it('should end call properly', async () => {
    const { result } = renderHook(() => useCall(mockSelectedChat))

    // Set up initial state
    act(() => {
      result.current.startCall()
    })

    await act(async () => {
      await result.current.endCall()
    })

    expect(result.current.isCallActive).toBe(false)
    expect(result.current.callStatus).toBe('Call ended')
  })

  it('should accept call successfully', async () => {
    const { result } = renderHook(() => useCall(mockSelectedChat))

    await act(async () => {
      await result.current.acceptCall()
    })

    expect(result.current.isCallActive).toBe(true)
    expect(result.current.callStatus).toBe('Call in progress')
  })

  it('should decline call', async () => {
    const { result } = renderHook(() => useCall(mockSelectedChat))

    jest.useFakeTimers()

    await act(async () => {
      await result.current.declineCall()
    })

    expect(result.current.callStatus).toBe('Declining call...')
    
    // Fast-forward timer
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(result.current.isCallActive).toBe(false)

    jest.useRealTimers()
  })

  it('should format call duration correctly', () => {
    const { result } = renderHook(() => useCall(mockSelectedChat))

    expect(result.current.formatCallDuration(30)).toBe('00:30')
    expect(result.current.formatCallDuration(90)).toBe('01:30')
    expect(result.current.formatCallDuration(3661)).toBe('01:01:01')
  })
})