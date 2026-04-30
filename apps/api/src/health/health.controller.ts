import { Controller, Get } from '@nestjs/common';

interface HealthResponse {
  status: 'ok';
  uptimeSec: number;
  service: string;
  version: string;
  timestamp: string;
}

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      uptimeSec: Math.floor(process.uptime()),
      service: 'custom-merch-api',
      version: process.env.npm_package_version ?? '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}
