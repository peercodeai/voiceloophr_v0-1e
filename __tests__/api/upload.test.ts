import { POST } from '../../app/api/upload/route'
import { NextRequest } from 'next/server'
import { documentService } from '../../services/documentService'

// Mock dependencies
jest.mock('../../services/documentService', () => ({
  documentService: {
    processAndSaveDocument: jest.fn()
  }
}))

jest.mock('../../lib/auth', () => ({
  getUserContext: jest.fn()
}))

jest.mock('../../lib/global-storage', () => ({
  setFileInGlobalStorage: jest.fn(),
  initializeGlobalStorage: jest.fn()
}))

const mockDocumentService = documentService as jest.Mocked<typeof documentService>

describe('/api/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully upload and process a document for authenticated user', async () => {
    const { getUserContext } = require('../../lib/auth')
    getUserContext.mockReturnValue({
      isGuest: false,
      userId: 'user-123',
      shouldSaveToDatabase: true
    })

    const mockProcessedDocument = {
      id: 'doc-123',
      userId: 'user-123',
      fileName: 'test.txt',
      content: 'Test content',
      wordCount: 2,
      pages: 1,
      metadata: {
        processingVersion: '2.0.0',
        processingMethod: 'direct',
        confidence: 1.0
      },
      uploadedAt: new Date().toISOString(),
      processed: true,
      processingError: null
    }

    mockDocumentService.processAndSaveDocument.mockResolvedValue(mockProcessedDocument as any)

    const formData = new FormData()
    formData.append('file', new File(['Test content'], 'test.txt', { type: 'text/plain' }))
    formData.append('saveToDatabase', 'true')
    formData.append('userId', 'user-123')

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.fileName).toBe('test.txt')
    expect(data.saved).toBe(true)
  })

  it('should handle guest users without saving to database', async () => {
    const { getUserContext } = require('../../lib/auth')
    getUserContext.mockReturnValue({
      isGuest: true,
      userId: null,
      shouldSaveToDatabase: false
    })

    const formData = new FormData()
    formData.append('file', new File(['Test content'], 'test.txt', { type: 'text/plain' }))
    formData.append('saveToDatabase', 'false')
    formData.append('userId', '00000000-0000-0000-0000-000000000000')

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.saved).toBe(false)
    expect(mockDocumentService.processAndSaveDocument).not.toHaveBeenCalled()
  })

  it('should return 400 for missing file', async () => {
    const formData = new FormData()
    formData.append('saveToDatabase', 'true')
    formData.append('userId', 'user-123')

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.statusCode).toBe(400)
    expect(data.message).toBe('No file provided')
    expect(data.code).toBe('MISSING_FILE')
  })

  it('should return 400 for file too large', async () => {
    const largeContent = 'x'.repeat(51 * 1024 * 1024) // 51MB
    const formData = new FormData()
    formData.append('file', new File([largeContent], 'large.txt', { type: 'text/plain' }))
    formData.append('saveToDatabase', 'true')
    formData.append('userId', 'user-123')

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.statusCode).toBe(400)
    expect(data.message).toContain('File too large')
    expect(data.code).toBe('FILE_TOO_LARGE')
  })

  it('should return 400 for unsupported file type', async () => {
    const formData = new FormData()
    formData.append('file', new File(['Test content'], 'test.exe', { type: 'application/x-executable' }))
    formData.append('saveToDatabase', 'true')
    formData.append('userId', 'user-123')

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.statusCode).toBe(400)
    expect(data.message).toBe('Unsupported file type')
    expect(data.code).toBe('UNSUPPORTED_FILE_TYPE')
  })

  it('should handle processing errors gracefully', async () => {
    const { getUserContext } = require('../../lib/auth')
    getUserContext.mockReturnValue({
      isGuest: false,
      userId: 'user-123',
      shouldSaveToDatabase: true
    })

    mockDocumentService.processAndSaveDocument.mockRejectedValue(new Error('Processing failed'))

    const formData = new FormData()
    formData.append('file', new File(['Test content'], 'test.txt', { type: 'text/plain' }))
    formData.append('saveToDatabase', 'true')
    formData.append('userId', 'user-123')

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.saved).toBe(false)
  })
})
