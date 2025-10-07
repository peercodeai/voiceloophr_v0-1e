import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    buildTime: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'local',
    environment: process.env.NODE_ENV || 'development',
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    vercelEnv: process.env.VERCEL_ENV || 'local',
    deploymentUrl: process.env.VERCEL_URL || 'localhost'
  })
}

