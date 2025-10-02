// Open-Source AI Text-to-Speech API Route
// This route handles text-to-speech using the self-hosted Coqui TTS service

import { NextRequest, NextResponse } from 'next/server';
import { openSourceAI, TTSRequest } from '@/lib/services/openSourceAIService';
import { z } from 'zod';

// Request validation schema
const TTSAPIRequestSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  model: z.string().optional(),
  voice: z.string().optional(),
  language: z.string().optional(),
  output_format: z.enum(['mp3', 'wav', 'flac']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedRequest = TTSAPIRequestSchema.parse(body);

    // Convert to internal format
    const ttsRequest: TTSRequest = {
      text: validatedRequest.text,
      model: validatedRequest.model || 'tts_models/multilingual/multi-dataset/xtts_v2',
      voice: validatedRequest.voice,
      language: validatedRequest.language || 'en',
      output_format: validatedRequest.output_format || 'mp3',
    };

    // Get TTS synthesis from open-source AI service
    const response = await openSourceAI.synthesize(ttsRequest);

    return NextResponse.json(response);
  } catch (error) {
    console.error('TTS API error:', error);

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
      status: health.tts ? 'healthy' : 'unhealthy',
      service: 'tts',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('TTS health check error:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        service: 'tts',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
