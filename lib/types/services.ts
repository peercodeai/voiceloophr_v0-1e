// Service-specific type definitions for VoiceLoop HR

// Google Calendar Types
export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  }>
  location?: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  created?: string
  updated?: string
  htmlLink?: string
}

export interface GoogleCalendarListResponse {
  kind: string
  etag: string
  nextPageToken?: string
  nextSyncToken?: string
  items: GoogleCalendarEvent[]
}

// Microsoft Graph Types
export interface MicrosoftEvent {
  id: string
  subject: string
  body?: {
    content: string
    contentType: 'text' | 'html'
  }
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  attendees?: Array<{
    emailAddress: {
      address: string
      name?: string
    }
    status: {
      response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded'
    }
  }>
  location?: {
    displayName: string
    address?: {
      street?: string
      city?: string
      state?: string
      countryOrRegion?: string
      postalCode?: string
    }
  }
  isAllDay?: boolean
  isCancelled?: boolean
  createdDateTime?: string
  lastModifiedDateTime?: string
  webLink?: string
}

export interface MicrosoftGraphResponse<T> {
  value: T[]
  '@odata.nextLink'?: string
}

// Twitter/X Integration Types
export interface TwitterTweet {
  id: string
  text: string
  created_at: string
  author_id: string
  public_metrics: {
    retweet_count: number
    like_count: number
    reply_count: number
    quote_count: number
  }
  referenced_tweets?: Array<{
    type: 'retweeted' | 'quoted' | 'replied_to'
    id: string
  }>
}

export interface TwitterUser {
  id: string
  username: string
  name: string
  public_metrics: {
    followers_count: number
    following_count: number
    tweet_count: number
    listed_count: number
  }
  verified?: boolean
  profile_image_url?: string
}

// Facebook Integration Types
export interface FacebookPost {
  id: string
  message?: string
  created_time: string
  from: {
    name: string
    id: string
  }
  likes: {
    data: Array<{
      id: string
      name: string
    }>
    summary: {
      total_count: number
    }
  }
  comments: {
    data: Array<{
      id: string
      message: string
      created_time: string
      from: {
        name: string
        id: string
      }
    }>
    summary: {
      total_count: number
    }
  }
}

// OpenAI Service Types
export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAIChatCompletion {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: OpenAIChatMessage
    finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter'
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface OpenAIEmbedding {
  object: string
  data: Array<{
    object: string
    index: number
    embedding: number[]
  }>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

// MCP (Model Context Protocol) Types
export interface MCPRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

export interface MCPNotification {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
}

// File Processing Types
export interface FileProcessorConfig {
  maxFileSize: number
  allowedMimeTypes: string[]
  processingTimeout: number
}

export interface ProcessingResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  processingTime: number
  metadata?: Record<string, unknown>
}

// API Response Types
export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  code?: string
  details?: unknown
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    currentPage: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

// Error Types
export interface APIError {
  statusCode: number
  message: string
  code?: string
  details?: unknown
  timestamp: string
  requestId?: string
}

// Configuration Types
export interface ServiceConfig {
  apiKey?: string
  baseUrl?: string
  timeout?: number
  retries?: number
  rateLimit?: {
    requests: number
    window: number
  }
}

export interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
  pool?: {
    min: number
    max: number
  }
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type NonNullable<T> = T extends null | undefined ? never : T

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// Event Types
export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  attendees: string[]
  location?: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  created: string
  updated: string
  source: 'google' | 'microsoft' | 'local'
}

// Social Media Types
export interface SocialMediaPost {
  id: string
  platform: 'twitter' | 'facebook' | 'linkedin'
  content: string
  author: {
    id: string
    name: string
    username?: string
    avatar?: string
  }
  createdAt: string
  metrics: {
    likes: number
    shares: number
    comments: number
  }
  url?: string
}

// Search Types
export interface SearchFilters {
  dateRange?: {
    start: string
    end: string
  }
  platforms?: string[]
  contentTypes?: string[]
  authors?: string[]
  keywords?: string[]
}

export interface SearchResult<T = unknown> {
  id: string
  title: string
  content: string
  source: string
  relevance: number
  metadata: T
  createdAt: string
  updatedAt: string
}
