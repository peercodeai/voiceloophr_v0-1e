import { DocumentService } from '../../services/documentService'
import { supabaseAdmin } from '../../lib/supabase'
import { AIService } from '../../lib/aiService'

// Mock dependencies
jest.mock('../../lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}))

jest.mock('../../lib/aiService', () => ({
  AIService: jest.fn().mockImplementation(() => ({
    analyzeText: jest.fn(),
    generateEmbeddings: jest.fn()
  }))
}))

jest.mock('../../lib/auth', () => ({
  getUserContext: jest.fn()
}))

const mockSupabaseAdmin = supabaseAdmin as jest.Mocked<typeof supabaseAdmin>
const mockAIService = AIService as jest.MockedClass<typeof AIService>

describe('DocumentService', () => {
  let documentService: DocumentService
  let mockAIServiceInstance: jest.Mocked<AIService>

  beforeEach(() => {
    jest.clearAllMocks()
    documentService = new DocumentService()
    mockAIServiceInstance = new AIService() as jest.Mocked<AIService>
  })

  describe('processAndSaveDocument', () => {
    const mockUserContext = {
      isGuest: false,
      userId: 'user-123',
      shouldSaveToDatabase: true
    }

    beforeEach(() => {
      const { getUserContext } = require('../../lib/auth')
      getUserContext.mockReturnValue(mockUserContext)
    })

    it('should process and save document for authenticated user', async () => {
      const mockDocument = {
        id: 'doc-123',
        user_id: 'user-123',
        file_name: 'test.txt',
        content: 'Test content',
        uploaded_at: new Date().toISOString()
      }

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockDocument, error: null })
      }

      mockSupabaseAdmin.from.mockReturnValue(mockQuery as any)

      const result = await documentService.processAndSaveDocument(
        'Test content',
        'test.txt',
        'user-123',
        'text/plain'
      )

      expect(result.id).toBe('doc-123')
      expect(result.userId).toBe('user-123')
      expect(result.fileName).toBe('test.txt')
      expect(result.content).toBe('Test content')
      expect(result.wordCount).toBe(2)
      expect(result.processed).toBe(true)
    })

    it('should handle guest users without saving to database', async () => {
      const { getUserContext } = require('../../lib/auth')
      getUserContext.mockReturnValue({
        isGuest: true,
        userId: null,
        shouldSaveToDatabase: false
      })

      const result = await documentService.processAndSaveDocument(
        'Test content',
        'test.txt',
        'guest-user',
        'text/plain'
      )

      expect(result.userId).toBe(null)
      expect(result.processed).toBe(true)
      expect(mockSupabaseAdmin.from).not.toHaveBeenCalled()
    })

    it('should handle database save errors', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database error' } 
        })
      }

      mockSupabaseAdmin.from.mockReturnValue(mockQuery as any)

      const result = await documentService.processAndSaveDocument(
        'Test content',
        'test.txt',
        'user-123',
        'text/plain'
      )

      expect(result.processingError).toContain('Database error')
    })

    it('should generate AI analysis when available', async () => {
      const mockAnalysis = {
        summary: 'Test summary',
        keywords: ['test', 'content'],
        sentimentScore: 0.8,
        topics: ['technology'],
        entities: ['test'],
        language: 'en'
      }

      mockAIServiceInstance.analyzeText.mockResolvedValue(mockAnalysis as any)

      const mockDocument = {
        id: 'doc-123',
        user_id: 'user-123',
        file_name: 'test.txt',
        content: 'Test content',
        uploaded_at: new Date().toISOString()
      }

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockDocument, error: null })
      }

      mockSupabaseAdmin.from.mockReturnValue(mockQuery as any)

      const result = await documentService.processAndSaveDocument(
        'Test content',
        'test.txt',
        'user-123',
        'text/plain'
      )

      expect(result.analysis).toBeDefined()
      expect(result.analysis?.summary).toBe('Test summary')
      expect(result.analysis?.keywords).toEqual(['test', 'content'])
    })
  })

  describe('getDocumentsForUser', () => {
    it('should return documents for authenticated user', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          user_id: 'user-123',
          file_name: 'test1.txt',
          content: 'Content 1',
          uploaded_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 'doc-2',
          user_id: 'user-123',
          file_name: 'test2.txt',
          content: 'Content 2',
          uploaded_at: '2023-01-02T00:00:00Z'
        }
      ]

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockDocuments,
          error: null,
          count: 2
        })
      }

      mockSupabaseAdmin.from.mockReturnValue(mockQuery as any)

      const result = await documentService.getDocumentsForUser('user-123', 1, 10)

      expect(result.documents).toHaveLength(2)
      expect(result.totalCount).toBe(2)
      expect(result.totalPages).toBe(1)
    })

    it('should return empty result for guest users', async () => {
      const { getUserContext } = require('../../lib/auth')
      getUserContext.mockReturnValue({
        isGuest: true,
        userId: null,
        shouldSaveToDatabase: false
      })

      const result = await documentService.getDocumentsForUser('guest-user', 1, 10)

      expect(result.documents).toEqual([])
      expect(result.totalCount).toBe(0)
      expect(result.totalPages).toBe(0)
    })

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: 0
        })
      }

      mockSupabaseAdmin.from.mockReturnValue(mockQuery as any)

      await expect(documentService.getDocumentsForUser('user-123', 1, 10))
        .rejects.toThrow('Database error')
    })
  })

  describe('searchDocuments', () => {
    it('should search documents for authenticated user', async () => {
      const mockSearchResults = [
        {
          id: 'doc-1',
          user_id: 'user-123',
          file_name: 'test1.txt',
          content: 'Test content',
          uploaded_at: '2023-01-01T00:00:00Z',
          similarity: 0.95
        }
      ]

      mockAIServiceInstance.generateEmbeddings.mockResolvedValue([0.1, 0.2, 0.3])

      const mockQuery = {
        rpc: jest.fn().mockResolvedValue({
          data: mockSearchResults,
          error: null
        })
      }

      mockSupabaseAdmin.rpc = mockQuery.rpc

      const result = await documentService.searchDocuments('test query', 'user-123')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('doc-1')
      expect(mockAIServiceInstance.generateEmbeddings).toHaveBeenCalledWith('test query')
    })

    it('should return empty array for guest users', async () => {
      const { getUserContext } = require('../../lib/auth')
      getUserContext.mockReturnValue({
        isGuest: true,
        userId: null,
        shouldSaveToDatabase: false
      })

      const result = await documentService.searchDocuments('test query', 'guest-user')

      expect(result).toEqual([])
    })
  })

  describe('deleteDocument', () => {
    it('should delete document for authenticated user', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      }

      mockSupabaseAdmin.from.mockReturnValue(mockQuery as any)

      const result = await documentService.deleteDocument('doc-123', 'user-123')

      expect(result).toBe(true)
      expect(mockQuery.delete).toHaveBeenCalled()
    })

    it('should return false for guest users', async () => {
      const { getUserContext } = require('../../lib/auth')
      getUserContext.mockReturnValue({
        isGuest: true,
        userId: null,
        shouldSaveToDatabase: false
      })

      const result = await documentService.deleteDocument('doc-123', 'guest-user')

      expect(result).toBe(false)
    })
  })
})
