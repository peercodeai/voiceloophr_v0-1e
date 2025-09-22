import { DocumentProcessor } from '../../lib/processors/documentProcessor'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'

// Mock file system operations
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    stat: jest.fn(),
  }
}))

const mockFs = fs as jest.Mocked<typeof fs>

describe('DocumentProcessor', () => {
  const tempDir = os.tmpdir()
  const testFilePath = path.join(tempDir, 'test.txt')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('isSupported', () => {
    it('should return true for supported MIME types', () => {
      expect(DocumentProcessor.isSupported('application/pdf', 'test.pdf')).toBe(true)
      expect(DocumentProcessor.isSupported('text/plain', 'test.txt')).toBe(true)
      expect(DocumentProcessor.isSupported('text/markdown', 'test.md')).toBe(true)
    })

    it('should return true for supported file extensions', () => {
      expect(DocumentProcessor.isSupported('application/octet-stream', 'test.pdf')).toBe(true)
      expect(DocumentProcessor.isSupported('application/octet-stream', 'test.docx')).toBe(true)
    })

    it('should return false for unsupported types', () => {
      expect(DocumentProcessor.isSupported('image/jpeg', 'test.jpg')).toBe(false)
      expect(DocumentProcessor.isSupported('video/mp4', 'test.mp4')).toBe(false)
    })
  })

  describe('processTextFile', () => {
    it('should process text file correctly', async () => {
      const mockContent = 'Hello World!\nThis is a test document.'
      const mockStats = {
        birthtime: new Date('2023-01-01'),
        mtime: new Date('2023-01-02'),
        isFile: () => true,
        size: 1000
      }

      mockFs.readFile.mockResolvedValue(mockContent)
      mockFs.stat.mockResolvedValue(mockStats as any)

      const result = await DocumentProcessor.processTextFile(testFilePath)

      expect(result.success).toBe(true)
      expect(result.content?.text).toBe(mockContent)
      expect(result.content?.metadata.wordCount).toBe(6)
      expect(result.content?.processingMethod).toBe('direct')
      expect(result.content?.confidence).toBe(1.0)
    })

    it('should handle empty text file', async () => {
      const mockContent = ''
      const mockStats = {
        birthtime: new Date('2023-01-01'),
        mtime: new Date('2023-01-02'),
        isFile: () => true,
        size: 0
      }

      mockFs.readFile.mockResolvedValue(mockContent)
      mockFs.stat.mockResolvedValue(mockStats as any)

      const result = await DocumentProcessor.processTextFile(testFilePath)

      expect(result.success).toBe(true)
      expect(result.content?.text).toBe('')
      expect(result.content?.metadata.wordCount).toBe(0)
    })

    it('should handle file read errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))

      const result = await DocumentProcessor.processTextFile(testFilePath)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Text file processing failed')
    })
  })

  describe('processMarkdownFile', () => {
    it('should extract title from first heading', async () => {
      const mockContent = '# My Document Title\n\nThis is the content.'
      const mockStats = {
        birthtime: new Date('2023-01-01'),
        mtime: new Date('2023-01-02'),
        isFile: () => true,
        size: 1000
      }

      mockFs.readFile.mockResolvedValue(mockContent)
      mockFs.stat.mockResolvedValue(mockStats as any)

      const result = await DocumentProcessor.processMarkdownFile(testFilePath)

      expect(result.success).toBe(true)
      expect(result.content?.metadata.title).toBe('My Document Title')
      expect(result.content?.processingMethod).toBe('markdown')
    })

    it('should use filename as title when no heading found', async () => {
      const mockContent = 'This is content without a heading.'
      const mockStats = {
        birthtime: new Date('2023-01-01'),
        mtime: new Date('2023-01-02'),
        isFile: () => true,
        size: 1000
      }

      mockFs.readFile.mockResolvedValue(mockContent)
      mockFs.stat.mockResolvedValue(mockStats as any)

      const result = await DocumentProcessor.processMarkdownFile(testFilePath)

      expect(result.success).toBe(true)
      expect(result.content?.metadata.title).toBe('test')
    })
  })

  describe('processCSVFile', () => {
    it('should process CSV file correctly', async () => {
      const mockContent = 'Name,Age,City\nJohn,30,New York\nJane,25,Los Angeles'
      const mockStats = {
        birthtime: new Date('2023-01-01'),
        mtime: new Date('2023-01-02'),
        isFile: () => true,
        size: 1000
      }

      mockFs.readFile.mockResolvedValue(mockContent)
      mockFs.stat.mockResolvedValue(mockStats as any)

      const result = await DocumentProcessor.processCSVFile(testFilePath)

      expect(result.success).toBe(true)
      expect(result.content?.text).toBe(mockContent)
      expect(result.content?.processingMethod).toBe('csv')
    })
  })

  describe('validateDocumentFile', () => {
    it('should return true for valid file', async () => {
      const mockStats = {
        isFile: () => true,
        size: 1000
      }

      mockFs.stat.mockResolvedValue(mockStats as any)

      const result = await DocumentProcessor.validateDocumentFile(testFilePath)

      expect(result).toBe(true)
    })

    it('should return false for non-file', async () => {
      const mockStats = {
        isFile: () => false,
        size: 1000
      }

      mockFs.stat.mockResolvedValue(mockStats as any)

      const result = await DocumentProcessor.validateDocumentFile(testFilePath)

      expect(result).toBe(false)
    })

    it('should return false for empty file', async () => {
      const mockStats = {
        isFile: () => true,
        size: 0
      }

      mockFs.stat.mockResolvedValue(mockStats as any)

      const result = await DocumentProcessor.validateDocumentFile(testFilePath)

      expect(result).toBe(false)
    })

    it('should return false for file that does not exist', async () => {
      mockFs.stat.mockRejectedValue(new Error('File not found'))

      const result = await DocumentProcessor.validateDocumentFile(testFilePath)

      expect(result).toBe(false)
    })
  })

  describe('getSupportedTypes', () => {
    it('should return array of supported MIME types', () => {
      const supportedTypes = DocumentProcessor.getSupportedTypes()
      
      expect(Array.isArray(supportedTypes)).toBe(true)
      expect(supportedTypes).toContain('application/pdf')
      expect(supportedTypes).toContain('text/plain')
      expect(supportedTypes).toContain('text/markdown')
    })
  })
})
