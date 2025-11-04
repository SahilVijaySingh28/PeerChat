import { searchAllUsers, sendFriendRequest, acceptFriendRequest, declineFriendRequest } from '../userService'

// Mock Firestore
jest.mock('@/config/firebase', () => ({
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    arrayUnion: jest.fn(),
    arrayRemove: jest.fn()
  },
  auth: {}
}))

// Mock Firestore functions
import { getDoc, getDocs, updateDoc, arrayUnion, arrayRemove } from '@/config/firebase'

describe('User Service - Extended Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.currentUser = { uid: 'user123', email: 'test@example.com', displayName: 'Test User' }
    global.db = { collection: jest.fn() }
  })

  describe('searchAllUsers', () => {
    it('should return empty array when no search query is provided', async () => {
      const result = await searchAllUsers('')
      expect(result).toEqual([])
    })

    it('should return empty array when currentUser is not set', async () => {
      global.currentUser = null
      const result = await searchAllUsers('john')
      expect(result).toEqual([])
    })

    it('should return matching users based on name', async () => {
      global.currentUser = { uid: 'user123' }
      
      getDocs.mockResolvedValue({
        forEach: (callback) => {
          // Current user (should be excluded)
          callback({
            id: 'user123',
            data: () => ({ 
              uid: 'user123', 
              name: 'Test User',
              email: 'test@example.com'
            })
          })
          // Matching user
          callback({
            id: 'user456',
            data: () => ({ 
              uid: 'user456', 
              name: 'John Doe',
              email: 'john@example.com'
            })
          })
          // Non-matching user
          callback({
            id: 'user789',
            data: () => ({ 
              uid: 'user789', 
              name: 'Jane Smith',
              email: 'jane@example.com'
            })
          })
        }
      })

      const result = await searchAllUsers('john')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('John Doe')
      expect(result[0].uid).toBe('user456')
    })

    it('should return matching users based on email', async () => {
      global.currentUser = { uid: 'user123' }
      
      getDocs.mockResolvedValue({
        forEach: (callback) => {
          // Current user (should be excluded)
          callback({
            id: 'user123',
            data: () => ({ 
              uid: 'user123', 
              name: 'Test User',
              email: 'test@example.com'
            })
          })
          // Matching user
          callback({
            id: 'user456',
            data: () => ({ 
              uid: 'user456', 
              name: 'John Doe',
              email: 'john.doe@example.com'
            })
          })
        }
      })

      const result = await searchAllUsers('john.doe@example.com')
      expect(result).toHaveLength(1)
      expect(result[0].email).toBe('john.doe@example.com')
    })

    it('should exclude current user from results', async () => {
      global.currentUser = { uid: 'user123' }
      
      getDocs.mockResolvedValue({
        forEach: (callback) => {
          // Current user (should be excluded)
          callback({
            id: 'user123',
            data: () => ({ 
              uid: 'user123', 
              name: 'Test User',
              email: 'test@example.com'
            })
          })
        }
      })

      const result = await searchAllUsers('test')
      expect(result).toHaveLength(0)
    })

    it('should handle case insensitive search', async () => {
      global.currentUser = { uid: 'user123' }
      
      getDocs.mockResolvedValue({
        forEach: (callback) => {
          callback({
            id: 'user456',
            data: () => ({ 
              uid: 'user456', 
              name: 'John Doe',
              email: 'john@example.com'
            })
          })
        }
      })

      const result1 = await searchAllUsers('JOHN')
      const result2 = await searchAllUsers('doe')
      expect(result1).toHaveLength(1)
      expect(result2).toHaveLength(1)
    })
  })

  describe('sendFriendRequest', () => {
    it('should send friend request successfully', async () => {
      // Mock finding the user by email
      getDocs.mockResolvedValue({
        empty: false,
        docs: [{
          data: () => ({ uid: 'friend123', name: 'John Doe', email: 'john@example.com' })
        }]
      })
      
      // Mock updating the friend's document
      updateDoc.mockResolvedValue()
      
      // Mock getting current user's document
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ notifications: [] })
      })

      const result = await sendFriendRequest('john@example.com')
      
      expect(result).toEqual({ uid: 'friend123', name: 'John Doe', email: 'john@example.com' })
      expect(updateDoc).toHaveBeenCalled()
    })

    it('should throw error when user not found', async () => {
      getDocs.mockResolvedValue({
        empty: true
      })

      await expect(sendFriendRequest('nonexistent@example.com')).rejects.toThrow('User with this email not found')
    })
  })

  describe('acceptFriendRequest', () => {
    it('should accept friend request successfully', async () => {
      updateDoc.mockResolvedValue()
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ notifications: [] })
      })

      const request = {
        from: 'requester123',
        fromEmail: 'requester@example.com',
        fromName: 'Requester User'
      }

      const result = await acceptFriendRequest(request)
      
      expect(result).toBe(true)
      expect(updateDoc).toHaveBeenCalledTimes(2) // Once for each user's friends list
    })
  })

  describe('declineFriendRequest', () => {
    it('should decline friend request successfully', async () => {
      updateDoc.mockResolvedValue()
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ notifications: [] })
      })

      const request = {
        from: 'requester123',
        fromEmail: 'requester@example.com',
        fromName: 'Requester User'
      }

      const result = await declineFriendRequest(request)
      
      expect(result).toBe(true)
      expect(updateDoc).toHaveBeenCalled()
    })
  })
})