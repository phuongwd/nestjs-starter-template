import { ApiProperty } from '@nestjs/swagger';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export class HealthPerformanceDto {
  @ApiProperty({
    description: 'Average check time in milliseconds',
    example: 45.5,
  })
  averageCheckTime!: number;

  @ApiProperty({
    description: 'Cache hit rate percentage',
    example: '75.00%',
  })
  cacheHitRate!: string;
}

export class HealthResponseDto {
  @ApiProperty({
    description: 'Current health status of the permission system',
    enum: ['healthy', 'degraded', 'unhealthy'],
    example: 'healthy',
  })
  status!: HealthStatus;

  @ApiProperty({
    description: 'Performance metrics',
    type: HealthPerformanceDto,
  })
  performance!: HealthPerformanceDto;

  @ApiProperty({
    description: 'Number of errors encountered',
    example: 5,
  })
  errors!: number;

  @ApiProperty({
    description: 'Timestamp of the last health check',
    example: '2024-02-21T07:45:04.781Z',
  })
  lastCheck!: string;
}
