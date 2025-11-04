import { searchFriends, isUserFriend } from '../userService'

// Mock Firestore
jest.mock('@/config/firebase', () => ({
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn()
  },
  auth: {}
}))

// Mock Firestore functions
import { getDoc, getDocs } from '@/config/firebase'

describe('User Service - Friend Search', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('searchFriends', () => {
    it('should return empty array when no search query is provided', async () => {
      const result = await searchFriends('')
      expect(result).toEqual([])
    })

    it('should return empty array when currentUser is not set', async () => {
      global.currentUser = null
      const result = await searchFriends('john')
      expect(result).toEqual([])
    })

    it('should return empty array when user has no friends', async () => {
      global.currentUser = { uid: 'user123' }
      
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ friends: [] })
      })

      const result = await searchFriends('john')
      expect(result).toEqual([])
    })

    it('should return matching friends based on name', async () => {
      global.currentUser = { uid: 'user123' }
      
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ friends: ['friend1', 'friend2'] })
      })

      getDocs.mockResolvedValue({
        forEach: (callback) => {
          callback({
            data: () => ({ 
              uid: 'friend1', 
              name: 'John Doe',
              email: 'john@example.com'
            })
          })
          callback({
            data: () => ({ 
              uid: 'friend2', 
              name: 'Jane Smith',
              email: 'jane@example.com'
            })
          })
        }
      })

      const result = await searchFriends('john')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('John Doe')
    })

    it('should return matching friends based on email', async () => {
      global.currentUser = { uid: 'user123' }
      
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ friends: ['friend1', 'friend2'] })
      })

      getDocs.mockResolvedValue({
        forEach: (callback) => {
          callback({
            data: () => ({ 
              uid: 'friend1', 
              name: 'John Doe',
              email: 'john@example.com'
            })
          })
          callback({
            data: () => ({ 
              uid: 'friend2', 
              name: 'Jane Smith',
              email: 'jane@example.com'
            })
          })
        }
      })

      const result = await searchFriends('jane@example.com')
      expect(result).toHaveLength(1)
      expect(result[0].email).toBe('jane@example.com')
    })

    it('should handle case insensitive search', async () => {
      global.currentUser = { uid: 'user123' }
      
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ friends: ['friend1'] })
      })

      getDocs.mockResolvedValue({
        forEach: (callback) => {
          callback({
            data: () => ({ 
              uid: 'friend1', 
              name: 'John Doe',
              email: 'john@example.com'
            })
          })
        }
      })

      const result1 = await searchFriends('JOHN')
      const result2 = await searchFriends('doe')
      expect(result1).toHaveLength(1)
      expect(result2).toHaveLength(1)
    })

    it('should handle special characters in search query', async () => {
      global.currentUser = { uid: 'user123' }
      
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ friends: ['friend1'] })
      })

      getDocs.mockResolvedValue({
        forEach: (callback) => {
          callback({
            data: () => ({ 
              uid: 'friend1', 
              name: 'John O\'Connor',
              email: 'john.oconnor@example.com'
            })
          })
        }
      })

      const result = await searchFriends('O\'Connor')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('John O\'Connor')
    })
  })

  describe('isUserFriend', () => {
    it('should return false when currentUser is not set', async () => {
      global.currentUser = null
      const result = await isUserFriend('friend123')
      expect(result).toBe(false)
    })

    it('should return false when user document does not exist', async () => {
      global.currentUser = { uid: 'user123' }
      
      getDoc.mockResolvedValue({
        exists: () => false
      })

      const result = await isUserFriend('friend123')
      expect(result).toBe(false)
    })

    it('should return true when user is in friends list', async () => {
      global.currentUser = { uid: 'user123' }
      
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ friends: ['friend123', 'friend456'] })
      })

      const result = await isUserFriend('friend123')
      expect(result).toBe(true)
    })

    it('should return false when user is not in friends list', async () => {
      global.currentUser = { uid: 'user123' }
      
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ friends: ['friend123', 'friend456'] })
      })

      const result = await isUserFriend('friend789')
      expect(result).toBe(false)
    })
  })
})