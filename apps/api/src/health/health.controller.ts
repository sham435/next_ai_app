import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@scrape-platform/shared-types';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.0.1',
    };
  }
}
