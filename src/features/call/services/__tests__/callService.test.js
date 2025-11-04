import { 
  createCallDocument, 
  setOffer, 
  setAnswer, 
  updateCallStatus, 
  endCall, 
  declineCall,
  addIceCandidate
} from '../callService'

// Mock Firestore
jest.mock('@/config/firebase', () => ({
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    getDoc: jest.fn(),
    serverTimestamp: jest.fn()
  }
}))

// Mock Firestore functions
import { addDoc, updateDoc, doc } from '@/config/firebase'

describe('Call Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createCallDocument', () => {
    it('should create a call document successfully', async () => {
      const mockCallId = 'call123'
      addDoc.mockResolvedValue({ id: mockCallId })
      
      const result = await createCallDocument('caller123', 'callee456')
      
      expect(result).toBe(mockCallId)
      expect(addDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          callerUid: 'caller123',
          calleeUid: 'callee456',
          status: 'initiated'
        })
      )
    })
  })

  describe('setOffer', () => {
    it('should set offer in Firestore', async () => {
      doc.mockReturnValue({ id: 'call123' })
      updateDoc.mockResolvedValue()
      
      const offer = { type: 'offer', sdp: 'offer-sdp' }
      await setOffer('call123', offer)
      
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          offer: offer,
          status: 'ringing'
        })
      )
    })
  })

  describe('setAnswer', () => {
    it('should set answer in Firestore', async () => {
      doc.mockReturnValue({ id: 'call123' })
      updateDoc.mockResolvedValue()
      
      const answer = { type: 'answer', sdp: 'answer-sdp' }
      await setAnswer('call123', answer)
      
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          answer: answer,
          status: 'accepted'
        })
      )
    })
  })

  describe('updateCallStatus', () => {
    it('should update call status in Firestore', async () => {
      doc.mockReturnValue({ id: 'call123' })
      updateDoc.mockResolvedValue()
      
      const result = await updateCallStatus('call123', 'accepted')
      
      expect(result).toBe(true)
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          status: 'accepted'
        })
      )
    })
  })

  describe('endCall', () => {
    it('should end call successfully', async () => {
      updateCallStatus.mockResolvedValue(true)
      
      const result = await endCall('call123')
      
      expect(result).toBe(true)
      expect(updateCallStatus).toHaveBeenCalledWith('call123', 'ended')
    })
  })

  describe('declineCall', () => {
    it('should decline call successfully', async () => {
      updateCallStatus.mockResolvedValue(true)
      
      const result = await declineCall('call123')
      
      expect(result).toBe(true)
      expect(updateCallStatus).toHaveBeenCalledWith('call123', 'declined')
    })
  })

  describe('addIceCandidate', () => {
    it('should add ICE candidate to Firestore', async () => {
      addDoc.mockResolvedValue()
      
      const candidatesRef = {}
      const candidate = {
        candidate: 'candidate-string',
        sdpMid: '0',
        sdpMLineIndex: 0
      }
      
      await addIceCandidate(candidatesRef, candidate)
      
      expect(addDoc).toHaveBeenCalledWith(candidatesRef, candidate)
    })

    it('should handle RTCIceCandidate objects', async () => {
      addDoc.mockResolvedValue()
      
      const candidatesRef = {}
      const rtcCandidate = {
        candidate: 'candidate-string',
        sdpMid: '0',
        sdpMLineIndex: 0,
        usernameFragment: 'frag123'
      }
      
      await addIceCandidate(candidatesRef, rtcCandidate)
      
      expect(addDoc).toHaveBeenCalledWith(
        candidatesRef,
        expect.objectContaining({
          candidate: 'candidate-string',
          sdpMid: '0',
          sdpMLineIndex: 0,
          usernameFragment: 'frag123'
        })
      )
    })

    it('should skip invalid candidates', async () => {
      addDoc.mockResolvedValue()
      
      const candidatesRef = {}
      const invalidCandidate = null
      
      await addIceCandidate(candidatesRef, invalidCandidate)
      
      expect(addDoc).not.toHaveBeenCalled()
    })
  })
})