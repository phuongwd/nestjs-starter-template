import { Injectable } from '@nestjs/common';

import { Logger } from '@nestjs/common';
import { AUTH_CONSTANTS } from '../constants/auth.constant';

@Injectable()
export class LoginAttemptService {
  private readonly logger = new Logger(LoginAttemptService.name);
  private readonly attempts = new Map<string, number>();
  private readonly lockouts = new Map<string, number>();

  async recordFailedAttempt(email: string): Promise<void> {
    const attempts = (this.attempts.get(email) || 0) + 1;
    this.attempts.set(email, attempts);

    if (attempts >= AUTH_CONSTANTS.MAX_FAILED_ATTEMPTS) {
      this.lockouts.set(
        email,
        Date.now() + AUTH_CONSTANTS.ACCOUNT_LOCK_DURATION,
      );
      this.logger.warn(`Account locked for email: ${email}`);
    }
  }

  async isAccountLocked(email: string): Promise<boolean> {
    const lockoutTime = this.lockouts.get(email);
    if (!lockoutTime) return false;

    if (Date.now() >= lockoutTime) {
      this.lockouts.delete(email);
      this.attempts.delete(email);
      return false;
    }
    return true;
  }

  async resetAttempts(email: string): Promise<void> {
    this.attempts.delete(email);
    this.lockouts.delete(email);
  }
}
