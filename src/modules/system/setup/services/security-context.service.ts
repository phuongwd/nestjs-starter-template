import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

export interface SecurityState {
  isAwaitingSetup: boolean;
  setupStartedAt?: Date;
  allowedIps: string[];
  environment: string;
}

/**
 * Manages security context for system setup operations
 * @description Handles environment validation, IP restrictions, and security state
 */
@Injectable()
export class SecurityContextService {
  private securityState!: SecurityState;

  constructor(private readonly configService: ConfigService) {
    this.initializeSecurityState();
  }

  private initializeSecurityState(): void {
    this.securityState = {
      isAwaitingSetup: true,
      allowedIps:
        this.configService.get<string>('SETUP_ALLOWED_IPS')?.split(',') || [],
      environment: this.configService.get<string>('NODE_ENV') || 'development',
    };
  }

  /**
   * Validates if setup is allowed in current environment
   * @throws {UnauthorizedException} If setup is not allowed
   */
  public async validateEnvironment(): Promise<void> {
    const environment = this.securityState.environment;

    // Prevent setup in production without explicit flag
    if (environment === 'production') {
      const isSetupAllowed = this.configService.get<boolean>(
        'ALLOW_PRODUCTION_SETUP',
      );
      if (!isSetupAllowed) {
        throw new UnauthorizedException(
          'Setup is not allowed in production environment',
        );
      }
    }
  }

  /**
   * Validates if IP is allowed to perform setup operations
   * @param ip The IP address to validate
   * @throws {UnauthorizedException} If IP is not allowed
   */
  public async validateIp(ip: string): Promise<void> {
    const allowedIps = this.securityState.allowedIps;

    // If no IPs are configured, allow all in non-production
    if (
      allowedIps.length === 0 &&
      this.securityState.environment !== 'production'
    ) {
      return;
    }

    // Check if IP is in allowed list
    if (!allowedIps.includes(ip)) {
      throw new UnauthorizedException(
        'IP not allowed to perform setup operations',
      );
    }
  }

  /**
   * Updates security state when setup begins
   */
  public markSetupStarted(): void {
    this.securityState = {
      ...this.securityState,
      setupStartedAt: new Date(),
    };
  }

  /**
   * Updates security state when setup completes
   */
  public markSetupCompleted(): void {
    this.securityState = {
      ...this.securityState,
      isAwaitingSetup: false,
    };
  }

  /**
   * Gets current security state
   */
  public getSecurityState(): SecurityState {
    return { ...this.securityState };
  }
}
