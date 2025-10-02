// Open-Source AI Transcription API Route
// This route handles speech-to-text using the self-hosted Whisper service

import { NextRequest, NextResponse } from 'next/server';
import { openSourceAI, TranscriptionRequest } from '@/lib/services/openSourceAIService';
import { z } from 'zod';

// Request validation schema
const TranscriptionAPIRequestSchema = z.object({
  audio: z.string().min(1, 'Audio data is required'),
  model: z.string().optional(),
  language: z.string().optional(),
  response_format: z.enum(['json', 'text', 'srt', 'verbose_json', 'vtt']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedRequest = TranscriptionAPIRequestSchema.parse(body);

    // Convert to internal format
    const transcriptionRequest: TranscriptionRequest = {
      audio: validatedRequest.audio,
      model: validatedRequest.model || 'base',
      language: validatedRequest.language,
      response_format: validatedRequest.response_format || 'json',
    };

    // Get transcription from open-source AI service
    const response = await openSourceAI.transcribe(transcriptionRequest);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Transcription API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.name === 'AIServiceError') {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const health = await openSourceAI.healthCheck();
    return NextResponse.json({
      status: health.whisper ? 'healthy' : 'unhealthy',
      service: 'whisper',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Whisper health check error:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        service: 'whisper',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
