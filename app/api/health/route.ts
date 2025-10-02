// Health Check API Route
// This route provides comprehensive health checks for all services

import { NextRequest, NextResponse } from 'next/server';
import { openSourceAI } from '@/lib/services/openSourceAIService';

// Health check response interface
interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  services: {
    database: boolean;
    ai_services: {
      vllm: boolean;
      whisper: boolean;
      tts: boolean;
      overall: boolean;
    };
    storage: boolean;
    redis: boolean;
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  environment: string;
}

// Database health check
async function checkDatabase(): Promise<boolean> {
  try {
    // Check if we can connect to the database
    // This is a simplified check - in production, you'd want to run a simple query
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return false;
    }
    
    // Simple connectivity check
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Storage health check (S3)
async function checkStorage(): Promise<boolean> {
  try {
    // Check if S3 bucket is accessible
    const s3Bucket = process.env.S3_BUCKET;
    if (!s3Bucket) {
      return false;
    }
    
    // In a real implementation, you'd check S3 connectivity
    // For now, we'll assume it's healthy if the bucket name is configured
    return true;
  } catch (error) {
    console.error('Storage health check failed:', error);
    return false;
  }
}

// Redis health check
async function checkRedis(): Promise<boolean> {
  try {
    // Check if Redis is accessible
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Simple connectivity check
    const response = await fetch(`${redisUrl}/ping`);
    return response.ok;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Get memory usage
function getMemoryUsage() {
  const used = process.memoryUsage();
  const total = used.heapTotal + used.external;
  const percentage = (used.heapUsed / total) * 100;
  
  return {
    used: Math.round(used.heapUsed / 1024 / 1024), // MB
    total: Math.round(total / 1024 / 1024), // MB
    percentage: Math.round(percentage),
  };
}

// Main health check handler
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Run all health checks in parallel
    const [
      databaseHealth,
      storageHealth,
      redisHealth,
      aiServicesHealth,
    ] = await Promise.allSettled([
      checkDatabase(),
      checkStorage(),
      checkRedis(),
      openSourceAI.healthCheck(),
    ]);
    
    // Extract results
    const database = databaseHealth.status === 'fulfilled' ? databaseHealth.value : false;
    const storage = storageHealth.status === 'fulfilled' ? storageHealth.value : false;
    const redis = redisHealth.status === 'fulfilled' ? redisHealth.value : false;
    const aiServices = aiServicesHealth.status === 'fulfilled' ? aiServicesHealth.value : {
      vllm: false,
      whisper: false,
      tts: false,
      overall: false,
    };
    
    // Determine overall status
    const criticalServices = [database, storage];
    const allCriticalHealthy = criticalServices.every(service => service);
    const aiServicesHealthy = aiServices.overall;
    
    let status: 'healthy' | 'unhealthy' | 'degraded';
    if (allCriticalHealthy && aiServicesHealthy) {
      status = 'healthy';
    } else if (allCriticalHealthy && !aiServicesHealthy) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    // Prepare response
    const response: HealthCheckResponse = {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database,
        ai_services: aiServices,
        storage,
        redis,
      },
      uptime: Math.floor(process.uptime()),
      memory: getMemoryUsage(),
      environment: process.env.NODE_ENV || 'development',
    };
    
    // Set appropriate HTTP status code
    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
    
    return NextResponse.json(response, { status: httpStatus });
  } catch (error) {
    console.error('Health check error:', error);
    
    const errorResponse: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: false,
        ai_services: {
          vllm: false,
          whisper: false,
          tts: false,
          overall: false,
        },
        storage: false,
        redis: false,
      },
      uptime: Math.floor(process.uptime()),
      memory: getMemoryUsage(),
      environment: process.env.NODE_ENV || 'development',
    };
    
    return NextResponse.json(errorResponse, { status: 503 });
  }
}

// Simple health check for load balancers
export async function HEAD(request: NextRequest) {
  try {
    // Quick check - just verify the app is running
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
