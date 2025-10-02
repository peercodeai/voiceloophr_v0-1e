// Open-Source AI Chat API Route
// This route handles chat completions using the self-hosted vLLM service

import { NextRequest, NextResponse } from 'next/server';
import { openSourceAI, ChatRequest } from '@/lib/services/openSourceAIService';
import { z } from 'zod';

// Request validation schema
const ChatAPIRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().min(1),
  })).min(1),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
  stream: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedRequest = ChatAPIRequestSchema.parse(body);

    // Convert to internal format
    const chatRequest: ChatRequest = {
      messages: validatedRequest.messages,
      model: validatedRequest.model || 'microsoft/DialoGPT-medium',
      temperature: validatedRequest.temperature || 0.7,
      max_tokens: validatedRequest.max_tokens || 1000,
      stream: validatedRequest.stream || false,
    };

    // Get chat completion from open-source AI service
    const response = await openSourceAI.chatCompletion(chatRequest);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);

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
      status: health.overall ? 'healthy' : 'unhealthy',
      services: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
