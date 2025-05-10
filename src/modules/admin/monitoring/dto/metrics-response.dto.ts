import { ApiProperty } from '@nestjs/swagger';
import { SystemMetrics } from '../interfaces/monitoring.interface';

export class MetricsResponseDto implements SystemMetrics {
  @ApiProperty({
    description: 'Total number of users in the system',
    example: 100,
  })
  totalUsers!: number;

  @ApiProperty({
    description: 'Number of active admin sessions',
    example: 5,
  })
  activeAdminSessions!: number;

  @ApiProperty({
    description: 'Number of pending setup tokens',
    example: 2,
  })
  pendingSetupTokens!: number;

  @ApiProperty({
    description: 'Number of failed login attempts in the last hour',
    example: 3,
  })
  recentFailedLogins!: number;

  constructor(metrics?: SystemMetrics) {
    if (metrics) {
      this.totalUsers = metrics.totalUsers;
      this.activeAdminSessions = metrics.activeAdminSessions;
      this.pendingSetupTokens = metrics.pendingSetupTokens;
      this.recentFailedLogins = metrics.recentFailedLogins;
    }
  }
}
