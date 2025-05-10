import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RequirePermissions } from '@shared/decorators/require-permissions.decorator';
import { INJECTION_TOKENS } from '../constants/injection-tokens';
import { IMetricsService } from '../interfaces/metrics.interface';
import { MetricsResponseDto } from '../dtos/metrics.response.dto';
import { HealthResponseDto } from '../dtos/health.response.dto';

@ApiTags('Monitoring')
@Controller('monitoring/permissions')
@UseGuards(JwtAuthGuard)
export class PermissionMetricsController {
  constructor(
    @Inject(INJECTION_TOKENS.SERVICE.METRICS)
    private readonly metricsService: IMetricsService,
  ) {}

  @Get('metrics')
  @RequirePermissions({ resource: 'monitoring', action: 'read' })
  @ApiOperation({ summary: 'Get permission check metrics' })
  @ApiResponse({
    status: 200,
    description: 'Permission metrics retrieved successfully',
    type: MetricsResponseDto,
  })
  getMetrics(): MetricsResponseDto {
    return this.metricsService.getMetrics();
  }

  @Get('health')
  @RequirePermissions({ resource: 'monitoring', action: 'read' })
  @ApiOperation({ summary: 'Get permission system health status' })
  @ApiResponse({
    status: 200,
    description: 'Permission system health status',
    type: HealthResponseDto,
  })
  getHealth(): HealthResponseDto {
    return this.metricsService.getHealth();
  }
}
