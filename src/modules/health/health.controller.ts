import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck } from '@nestjs/terminus';
import { HealthService } from './health.service';
import { Public } from '@shared/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Check system health',
    description:
      'Performs health checks on database, disk space, memory usage, and external services',
  })
  async check() {
    return this.healthService.checkAll();
  }

  @Get('quick')
  @Public()
  @ApiOperation({
    summary: 'Quick health check',
    description: 'Performs a lightweight TCP connection check to the database',
  })
  async quickCheck() {
    return this.healthService.quickCheck();
  }
}
