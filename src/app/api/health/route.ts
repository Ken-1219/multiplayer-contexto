import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '@/lib/game';

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    gameService: 'healthy' | 'unhealthy';
    huggingfaceApi: 'healthy' | 'not_configured' | 'unhealthy';
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    nodeVersion: string;
    platform: string;
  };
}

// Store app start time for uptime calculation
const startTime = Date.now();

/**
 * Health check endpoint for monitoring and load balancer probes
 * GET /api/health
 */
export async function GET(
  _request: NextRequest
): Promise<NextResponse<HealthCheckResponse>> {
  try {
    const now = Date.now();
    const uptime = now - startTime;

    // Test game service
    let gameServiceStatus: 'healthy' | 'unhealthy' = 'healthy';
    try {
      const gameService = getGameService();
      gameService.getGameState(); // Simple test
    } catch {
      gameServiceStatus = 'unhealthy';
    }

    // Test HuggingFace API configuration
    let huggingfaceStatus: 'healthy' | 'not_configured' | 'unhealthy' =
      'not_configured';
    if (process.env.HUGGINGFACE_API_TOKEN) {
      huggingfaceStatus = 'healthy'; // Just check if configured, don't make actual API call
    }

    // Get system information
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const memoryPercentage = Math.round(
      (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
    );

    // Determine overall health status
    const isHealthy = gameServiceStatus === 'healthy';
    const overallStatus: 'healthy' | 'unhealthy' = isHealthy
      ? 'healthy'
      : 'unhealthy';

    const healthData: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime / 1000), // Convert to seconds
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        gameService: gameServiceStatus,
        huggingfaceApi: huggingfaceStatus,
      },
      system: {
        memory: {
          used: memoryUsedMB,
          total: memoryTotalMB,
          percentage: memoryPercentage,
        },
        nodeVersion: process.version,
        platform: process.platform,
      },
    };

    // Return appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    return NextResponse.json(healthData, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);

    const errorResponse: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        gameService: 'unhealthy',
        huggingfaceApi: 'unhealthy',
      },
      system: {
        memory: {
          used: 0,
          total: 0,
          percentage: 0,
        },
        nodeVersion: process.version || 'unknown',
        platform: process.platform || 'unknown',
      },
    };

    return NextResponse.json(errorResponse, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  }
}

/**
 * Simple ping endpoint for basic connectivity checks
 * HEAD /api/health
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

// Handle unsupported methods
export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
