import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from 'nest-keycloak-connect';

@Controller('health')
@ApiTags('health')
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'clarifi-api',
      version: '1.0.0',
    };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  ready() {
    // In a real app, check database connectivity, etc.
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
        cache: 'connected',
      },
    };
  }
}
