import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SystemMonitoringService } from '../services/system-monitoring.service';
import { RequireSystemRole } from '../../system-roles/decorators/require-system-role.decorator';
import { PaginatedResponse } from '../interfaces/monitoring.interface';
import { SecurityAlert, AuditLog } from '@prisma/client';
import { MetricsResponseDto } from '../dto/metrics-response.dto';

/**
 * Controller for system monitoring operations
 * @description Provides endpoints for system metrics, security alerts, and audit logs
 */
@ApiTags('System Monitoring')
@Controller('admin/monitoring')
@RequireSystemRole('SYSTEM_ADMIN')
export class MonitoringController {
  constructor(private readonly monitoringService: SystemMonitoringService) {}

  /**
   * Get system metrics
   * @returns Current system metrics
   */
  @Get('metrics')
  @ApiOperation({ summary: 'Get system metrics' })
  @ApiResponse({
    status: 200,
    description: 'System metrics retrieved successfully',
    type: MetricsResponseDto,
  })
  async getMetrics(): Promise<MetricsResponseDto> {
    const metrics = await this.monitoringService.collectMetrics();
    return new MetricsResponseDto(metrics);
  }

  /**
   * Get security alerts with pagination
   */
  @Get('alerts')
  @ApiOperation({ summary: 'Get security alerts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Security alerts retrieved successfully',
  })
  async getAlerts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ): Promise<PaginatedResponse<SecurityAlert>> {
    const skip = (page - 1) * limit;
    const [alerts, total] = await this.monitoringService.getSecurityAlerts({
      skip,
      take: limit,
      status,
    });

    return {
      data: alerts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get system audit logs with pagination
   */
  @Get('audit-logs')
  @ApiOperation({ summary: 'Get system audit logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
  })
  async getAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('action') action?: string,
  ): Promise<PaginatedResponse<AuditLog>> {
    const skip = (page - 1) * limit;
    const [logs, total] = await this.monitoringService.getAuditLogs({
      skip,
      take: limit,
      action,
    });

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
