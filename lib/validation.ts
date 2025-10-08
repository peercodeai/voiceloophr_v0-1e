import { z } from 'zod'

// Common validation schemas
export const uuidSchema = z.string().uuid('Invalid UUID format')
export const fileNameSchema = z.string()
  .min(1, 'File name cannot be empty')
  .max(255, 'File name exceeds maximum allowed length')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'File name contains invalid characters')

export const contentSchema = z.string()
  .min(1, 'Content cannot be empty')
  .max(1000000, 'Content exceeds maximum allowed length')

// Document storage validation
export const documentStoreSchema = z.object({
  content: contentSchema,
  fileName: fileNameSchema,
  userId: uuidSchema.optional().nullable()
})

// File upload validation
export const fileUploadSchema = z.object({
  file: z.any().refine((file) => file instanceof File, 'Invalid file object'),
  saveToDatabase: z.boolean().optional().default(false),
  userId: z.string().optional()
})

// Document analysis validation
export const documentAnalysisSchema = z.object({
  text: contentSchema,
  fileName: fileNameSchema.optional(),
  fileType: z.string().optional(),
  openaiKey: z.string().optional()
})

// Chat validation
export const chatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long'),
  contextText: z.string().optional(),
  fileId: z.string().optional(),
  openaiKey: z.string().optional()
})

// TTS validation
export const ttsSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty').max(1000, 'Text too long'),
  voice: z.string().optional()
})

// STT validation
export const sttSchema = z.object({
  audioFile: z.any().refine((file) => file instanceof File, 'Invalid audio file')
})

// Process validation
export const processSchema = z.object({
  fileId: z.string().min(1, 'File ID is required')
})

// Error response helper
export class ValidationError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// API Error response helper
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

// Standard error response format
export interface ErrorResponse {
  statusCode: number
  message: string
  code?: string
  details?: any
}

// Helper function to create standardized error responses
export function createErrorResponse(
  statusCode: number,
  message: string,
  code?: string,
  details?: any
): ErrorResponse {
  return {
    statusCode,
    message,
    code,
    details
  }
}

// Validation helper function
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(400, 'Validation failed', 'VALIDATION_ERROR', error.errors)
    }
    throw error
  }
}
