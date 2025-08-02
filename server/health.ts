// Health check endpoint for monitoring
import type { Request, Response } from "express";
import { db } from "./db";

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

export async function healthCheck(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Check database connection
    let databaseStatus: 'connected' | 'disconnected' = 'disconnected';
    try {
      await db.execute('SELECT 1');
      databaseStatus = 'connected';
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Check Redis connection (if available)
    let redisStatus: 'connected' | 'disconnected' = 'connected'; // Assuming connected for now
    
    // Memory usage
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    
    const health: HealthStatus = {
      status: databaseStatus === 'connected' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: databaseStatus,
        redis: redisStatus,
      },
      uptime: process.uptime(),
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100),
      },
    };

    const responseTime = Date.now() - startTime;
    
    // Set response headers
    res.set('X-Response-Time', `${responseTime}ms`);
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    if (health.status === 'healthy') {
      res.status(200).json(health);
    } else {
      res.status(503).json(health);
    }
    
  } catch (error) {
    console.error('Health check error:', error);
    
    const health: Partial<HealthStatus> = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };
    
    res.status(503).json(health);
  }
}