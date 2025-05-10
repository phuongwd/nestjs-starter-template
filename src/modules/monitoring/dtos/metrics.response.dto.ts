import { ApiProperty } from '@nestjs/swagger';

export class MetricsResponseDto {
  @ApiProperty({
    description: 'Number of cache hits',
    example: 150,
  })
  cacheHits!: number;

  @ApiProperty({
    description: 'Number of cache misses',
    example: 50,
  })
  cacheMisses!: number;

  @ApiProperty({
    description: 'Total number of permission checks',
    example: 200,
  })
  totalChecks!: number;

  @ApiProperty({
    description: 'Number of errors encountered',
    example: 5,
  })
  errors!: number;

  @ApiProperty({
    description: 'Average time per check in milliseconds',
    example: 45.5,
  })
  averageCheckTime!: number;

  @ApiProperty({
    description: 'Total time spent checking permissions in milliseconds',
    example: 9100,
  })
  totalCheckTime!: number;

  @ApiProperty({
    description: 'Number of system admin permission bypasses',
    example: 10,
  })
  systemAdminBypasses!: number;

  @ApiProperty({
    description: 'Cache hit rate percentage',
    example: '75.00%',
  })
  cacheHitRate!: string;
}
