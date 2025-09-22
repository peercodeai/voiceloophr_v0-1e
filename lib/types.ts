// Comprehensive TypeScript interfaces for VoiceLoop HR

// User and Authentication Types
export interface User {
  id: string
  email?: string
  name?: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

// Document Types
export interface DocumentMetadata {
  author?: string
  creationDate?: Date
  lastModifiedDate?: Date
  pageCount?: number
  wordCount?: number
  fileSize?: number
  processingVersion?: string
  processingMethod?: string
  confidence?: number
  note?: string
  warnings?: string[]
}

export interface DocumentAnalysis {
  summary: string
  keywords: string[]
  sentimentScore?: number
  topics?: string[]
  entities?: string[]
  language?: string
  readingTime?: number
  complexity?: 'low' | 'medium' | 'high'
}

export interface ProcessedDocument {
  id: string
  userId: string | null
  fileName: string
  content: string
  wordCount: number
  pages: number
  metadata: DocumentMetadata
  analysis?: DocumentAnalysis
  processingTime?: number
  uploadedAt: string
  processed: boolean
  processingError?: string | null
  storagePath?: string | null
  contentType?: string
}

// File Upload Types
export interface UploadedFile {
  id: string
  file: File
  status: 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled'
  progress: number
  error?: string
  warning?: string
  fileId?: string
  showTextractButton?: boolean
  abortController?: AbortController
  isCancellable?: boolean
}

export interface FileUploadResult {
  success: boolean
  fileId?: string
  fileName?: string
  fileType?: string
  fileSize?: number
  wordCount?: number
  extractedText?: string
  saved?: boolean
  storagePath?: string | null
  contentType?: string
  documentId?: string | null
  message?: string
  error?: string
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  code?: string
  details?: any
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  currentPage: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface ErrorResponse {
  statusCode: number
  message: string
  code?: string
  details?: any
}

// Document Chunk Types (for RAG)
export interface DocumentChunk {
  id: string
  documentId: string
  content: string
  embedding?: number[]
  chunkIndex: number
  startPosition: number
  endPosition: number
  metadata?: Record<string, any>
}

// Search Types
export interface SearchResult {
  id: string
  content: string
  fileName: string
  similarity: number
  metadata?: DocumentMetadata
}

export interface SearchParams {
  query: string
  limit?: number
  threshold?: number
  userId?: string
}

// Chat Types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface ChatResponse {
  success: boolean
  response: string
  hasContext: boolean
  metadata?: Record<string, any>
  error?: string
}

// Calendar Types
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  description?: string
  location?: string
  attendees?: string[]
  allDay?: boolean
  source: 'google' | 'microsoft' | 'local'
}

// Voice/Audio Types
export interface AudioProcessingResult {
  success: boolean
  transcript?: string
  audioUrl?: string
  duration?: number
  error?: string
}

export interface TTSRequest {
  text: string
  voice?: string
  speed?: number
  pitch?: number
}

export interface TTSResponse {
  success: boolean
  audioUrl?: string
  duration?: number
  error?: string
}

// Form Types
export interface DocumentFormData {
  fileName: string
  content: string
  userId?: string
  saveToDatabase: boolean
}

// Global Storage Types
export interface GlobalFileData {
  id: string
  name: string
  type: string
  size: number
  buffer: string // base64 encoded
  uploadedAt: string
  processed: boolean
  processingError: string | null
  warnings: string[]
  extractedText: string
  wordCount: number
  pages: number
  metadata: DocumentMetadata
  storagePath?: string | null
  contentType?: string
  userId?: string
}

// Service Types
export interface AIServiceConfig {
  apiKey: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface EmbeddingResult {
  embedding: number[]
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

// Database Types
export interface DatabaseDocument {
  id: string
  user_id: string | null
  file_name: string
  content: string
  uploaded_at: string
  created_at: string
  updated_at: string
}

export interface DatabaseEmbedding {
  id: string
  document_id: string
  embedding: number[]
  created_at: string
}

// Utility Types
export type FileType = 
  | 'pdf' 
  | 'doc' 
  | 'docx' 
  | 'txt' 
  | 'md' 
  | 'csv' 
  | 'jpg' 
  | 'jpeg' 
  | 'png' 
  | 'gif' 
  | 'bmp' 
  | 'tiff' 
  | 'wav' 
  | 'mp3' 
  | 'mp4' 
  | 'avi' 
  | 'mov'

export type ProcessingStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled'

export type ProcessingMethod = 
  | 'direct' 
  | 'pdf-parse' 
  | 'pdf-parse-fixed' 
  | 'textract' 
  | 'tesseract' 
  | 'mammoth' 
  | 'xlsx'

// Event Types
export interface FileUploadEvent {
  type: 'upload_start' | 'upload_progress' | 'upload_complete' | 'upload_error'
  fileId: string
  progress?: number
  error?: string
  data?: any
}

export interface ProcessingEvent {
  type: 'processing_start' | 'processing_progress' | 'processing_complete' | 'processing_error'
  fileId: string
  progress?: number
  error?: string
  data?: any
}
