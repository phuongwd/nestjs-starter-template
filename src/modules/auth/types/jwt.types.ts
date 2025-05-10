/**
 * JWT-related constants
 */
export const JWT_CONSTANTS = {
  DEFAULT_EXPIRES_IN: 900, // 15 minutes
  EXAMPLE_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
} as const;

/**
 * Secure JWT payload with minimal data
 * @description Contains only essential data for token validation and user identification
 */
export interface JwtPayload {
  /** User ID */
  readonly sub: number;

  /** Unique token ID for revocation */
  readonly jti: string;

  /** Token issued at timestamp */
  readonly iat: number;

  /** Token expiration timestamp */
  readonly exp: number;

  /** Token fingerprint (hash of user agent + IP) */
  readonly fgp: string;

  /** Token version for revocation */
  readonly ver: number;
}

/**
 * Token fingerprint generation options
 */
export interface TokenFingerprintOptions {
  /** User agent string from request */
  readonly userAgent?: string;

  /** IP address from request */
  readonly ip?: string;

  /** Additional data for fingerprint generation */
  readonly additionalData?: Record<string, unknown>;
}

/**
 * Token version information
 */
export interface TokenVersion {
  /** User ID */
  readonly userId: number;

  /** Current token version */
  readonly currentVersion: number;

  /** Last update timestamp */
  readonly updatedAt: Date;
}

/**
 * Token revocation record
 */
export interface TokenRevocation {
  /** Unique token ID */
  readonly jti: string;

  /** User ID */
  readonly userId: number;

  /** Revocation timestamp */
  readonly revokedAt: Date;

  /** Reason for revocation */
  readonly reason: string;

  /** Token fingerprint (optional) */
  readonly fingerprint?: string;
}
