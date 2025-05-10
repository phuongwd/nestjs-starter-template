import { Controller, Get, Header, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PrometheusService } from './prometheus.service';
import { Public } from '@shared/decorators/public.decorator';

/**
 * Controller for Prometheus metrics
 * @description Exposes metrics endpoint for Prometheus scraping
 */
@ApiTags('Prometheus')
@Controller({
  path: 'metrics',
  version: VERSION_NEUTRAL,
})
export class PrometheusController {
  constructor(private readonly prometheusService: PrometheusService) {}

  /**
   * Get Prometheus metrics
   * @returns Prometheus metrics in text format
   */
  @Get()
  @Public()
  @Header('Content-Type', 'text/plain')
  @ApiOperation({
    summary: 'Get Prometheus metrics',
    description: 'Returns all metrics in Prometheus format',
  })
  async getMetrics(@Res() response: Response): Promise<void> {
    const metrics = await this.prometheusService.getMetrics();
    response.send(metrics);
  }

  /**
   * Health check endpoint for Prometheus
   * @returns Simple OK response for Prometheus health checks
   */
  @Get('health')
  @Public()
  @ApiOperation({
    summary: 'Prometheus health check',
    description: 'Simple health check endpoint for Prometheus',
  })
  healthCheck(@Res() response: Response): void {
    response.status(200).send('OK');
  }
}
