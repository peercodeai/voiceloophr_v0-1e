// Open-Source AI Service Implementation
// This service provides integration with self-hosted AI services (vLLM, Whisper, TTS)

import { z } from 'zod';

// Configuration schema
const AIServiceConfigSchema = z.object({
  vllmEndpoint: z.string().url(),
  whisperEndpoint: z.string().url(),
  ttsEndpoint: z.string().url(),
  apiKey: z.string().optional(),
  timeout: z.number().default(30000),
});

export type AIServiceConfig = z.infer<typeof AIServiceConfigSchema>;

// Request/Response schemas
const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema),
  model: z.string().default('microsoft/DialoGPT-medium'),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().positive().default(1000),
  stream: z.boolean().default(false),
});

const TranscriptionRequestSchema = z.object({
  audio: z.string(), // base64 encoded audio
  model: z.string().default('base'),
  language: z.string().optional(),
  response_format: z.enum(['json', 'text', 'srt', 'verbose_json', 'vtt']).default('json'),
});

const TTSRequestSchema = z.object({
  text: z.string(),
  model: z.string().default('tts_models/multilingual/multi-dataset/xtts_v2'),
  voice: z.string().optional(),
  language: z.string().default('en'),
  output_format: z.enum(['mp3', 'wav', 'flac']).default('mp3'),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type TranscriptionRequest = z.infer<typeof TranscriptionRequestSchema>;
export type TTSRequest = z.infer<typeof TTSRequestSchema>;

// Response types
export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface TranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
}

export interface TTSResponse {
  audio: string; // base64 encoded audio
  format: string;
  duration: number;
}

// Error types
export class AIServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public service: 'vllm' | 'whisper' | 'tts'
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// Open-Source AI Service Class
export class OpenSourceAIService {
  private config: AIServiceConfig;
  private defaultHeaders: Record<string, string>;

  constructor(config: AIServiceConfig) {
    this.config = AIServiceConfigSchema.parse(config);
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'VoiceLoopHR/1.0',
    };

    if (this.config.apiKey) {
      this.defaultHeaders['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
  }

  // Chat completion using vLLM
  async chatCompletion(request: ChatRequest): Promise<ChatResponse> {
    try {
      const validatedRequest = ChatRequestSchema.parse(request);
      
      const response = await fetch(`${this.config.vllmEndpoint}/chat/completions`, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify(validatedRequest),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new AIServiceError(
          `vLLM API error: ${response.status} ${response.statusText}`,
          response.status,
          'vllm'
        );
      }

      const data = await response.json();
      return data as ChatResponse;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        `Chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'vllm'
      );
    }
  }

  // Text generation using vLLM
  async generateText(prompt: string, options: Partial<ChatRequest> = {}): Promise<string> {
    const request: ChatRequest = {
      messages: [{ role: 'user', content: prompt }],
      ...options,
    };

    const response = await this.chatCompletion(request);
    return response.choices[0]?.message?.content || '';
  }

  // Speech-to-text using Whisper
  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    try {
      const validatedRequest = TranscriptionRequestSchema.parse(request);
      
      const response = await fetch(`${this.config.whisperEndpoint}/transcribe`, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify(validatedRequest),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new AIServiceError(
          `Whisper API error: ${response.status} ${response.statusText}`,
          response.status,
          'whisper'
        );
      }

      const data = await response.json();
      return data as TranscriptionResponse;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'whisper'
      );
    }
  }

  // Text-to-speech using Coqui TTS
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    try {
      const validatedRequest = TTSRequestSchema.parse(request);
      
      const response = await fetch(`${this.config.ttsEndpoint}/synthesize`, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify(validatedRequest),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new AIServiceError(
          `TTS API error: ${response.status} ${response.statusText}`,
          response.status,
          'tts'
        );
      }

      const data = await response.json();
      return data as TTSResponse;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        `TTS synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'tts'
      );
    }
  }

  // Health check for all services
  async healthCheck(): Promise<{
    vllm: boolean;
    whisper: boolean;
    tts: boolean;
    overall: boolean;
  }> {
    const results = await Promise.allSettled([
      this.checkServiceHealth('vllm', `${this.config.vllmEndpoint}/health`),
      this.checkServiceHealth('whisper', `${this.config.whisperEndpoint}/health`),
      this.checkServiceHealth('tts', `${this.config.ttsEndpoint}/health`),
    ]);

    const [vllm, whisper, tts] = results.map(result => 
      result.status === 'fulfilled' && result.value
    );

    return {
      vllm: vllm as boolean,
      whisper: whisper as boolean,
      tts: tts as boolean,
      overall: vllm && whisper && tts,
    };
  }

  private async checkServiceHealth(serviceName: string, url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.defaultHeaders,
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      console.error(`${serviceName} health check failed:`, error);
      return false;
    }
  }

  // Get available models
  async getAvailableModels(): Promise<{
    vllm: string[];
    whisper: string[];
    tts: string[];
  }> {
    const [vllmModels, whisperModels, ttsModels] = await Promise.allSettled([
      this.getVLLMModels(),
      this.getWhisperModels(),
      this.getTTSModels(),
    ]);

    return {
      vllm: vllmModels.status === 'fulfilled' ? vllmModels.value : [],
      whisper: whisperModels.status === 'fulfilled' ? whisperModels.value : [],
      tts: ttsModels.status === 'fulfilled' ? ttsModels.value : [],
    };
  }

  private async getVLLMModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.vllmEndpoint}/models`, {
        headers: this.defaultHeaders,
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.data?.map((model: any) => model.id) || [];
    } catch {
      return [];
    }
  }

  private async getWhisperModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.whisperEndpoint}/models`, {
        headers: this.defaultHeaders,
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.models || [];
    } catch {
      return [];
    }
  }

  private async getTTSModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.ttsEndpoint}/models`, {
        headers: this.defaultHeaders,
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.models || [];
    } catch {
      return [];
    }
  }
}

// Factory function to create service instance
export function createOpenSourceAIService(): OpenSourceAIService {
  const config: AIServiceConfig = {
    vllmEndpoint: process.env.VLLM_ENDPOINT || 'http://localhost:8000/v1',
    whisperEndpoint: process.env.WHISPER_ENDPOINT || 'http://localhost:8001',
    ttsEndpoint: process.env.TTS_ENDPOINT || 'http://localhost:8002',
    apiKey: process.env.AI_SERVICE_API_KEY,
    timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000'),
  };

  return new OpenSourceAIService(config);
}

// Export default instance
export const openSourceAI = createOpenSourceAIService();
