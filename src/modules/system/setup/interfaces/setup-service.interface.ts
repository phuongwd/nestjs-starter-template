import { SetupToken } from '@prisma/client';

/**
 * Setup completion data interface
 */
export interface SetupCompletionData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  setupToken: string;
  metadata?: Record<string, unknown>;
}

/**
 * Setup service interface
 * @description Service contract for admin setup operations
 */
export interface ISetupService {
  /**
   * Generate a new setup token
   * @param ip IP address requesting the token
   * @param fingerprint Optional browser fingerprint
   */
  generateToken(ip: string, fingerprint?: string): Promise<SetupToken>;

  /**
   * Complete the admin setup process
   * @param data Setup completion data
   * @param ip IP address completing setup
   */
  completeSetup(data: SetupCompletionData, ip: string): Promise<void>;

  /**
   * Check if system setup is required
   */
  isSetupRequired(): Promise<boolean>;

  /**
   * Validate a setup token
   * @param token Token to validate
   * @param ip IP address validating the token
   */
  validateToken(token: string, ip: string): Promise<boolean>;
}
