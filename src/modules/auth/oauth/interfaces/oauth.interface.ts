/**
 * Supported OAuth platform types
 */
export type OAuthPlatform = 'ios' | 'android' | 'web';

/**
 * Supported OAuth provider types
 */
export type OAuthProvider = 'google' | 'github' | 'microsoft' | 'apple';

/**
 * OAuth provider configuration
 */
export interface OAuthProviderConfig {
  readonly requiredEnvVars: string[];
  readonly provider: OAuthProvider;
}

/**
 * OAuth provider configuration map
 */
export const OAUTH_PROVIDER_CONFIGS: Readonly<
  Record<OAuthProvider, OAuthProviderConfig>
> = {
  google: {
    requiredEnvVars: [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_REDIRECT_URI',
    ],
    provider: 'google',
  },
  github: {
    requiredEnvVars: [
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'GITHUB_REDIRECT_URI',
    ],
    provider: 'github',
  },
  microsoft: {
    requiredEnvVars: [
      'MICROSOFT_CLIENT_ID',
      'MICROSOFT_CLIENT_SECRET',
      'MICROSOFT_REDIRECT_URI',
      'MICROSOFT_TENANT_ID',
    ],
    provider: 'microsoft',
  },
  apple: {
    requiredEnvVars: [
      'APPLE_CLIENT_ID',
      'APPLE_TEAM_ID',
      'APPLE_KEY_ID',
      'APPLE_PRIVATE_KEY',
      'APPLE_REDIRECT_URI',
    ],
    provider: 'apple',
  },
} as const;

/**
 * Standardized user profile returned by all OAuth providers
 */
export interface OAuthUserProfile {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly displayName?: string;
  readonly avatar?: string;
  readonly provider: OAuthProvider;
}

/**
 * OAuth provider interface that must be implemented by all providers
 */
export interface IOAuthProvider {
  /**
   * Get the authorization URL for the OAuth provider
   * @param state - CSRF state token
   * @param platform - Optional platform type
   */
  getAuthorizationUrl(state: string, platform?: OAuthPlatform): Promise<string>;

  /**
   * Handle the OAuth callback and return standardized user profile
   * @param code - Authorization code
   * @param state - CSRF state token
   * @param platform - Optional platform type
   */
  handleCallback(
    code: string,
    state: string,
    platform?: OAuthPlatform,
  ): Promise<OAuthUserProfile>;
}

/**
 * Standard OAuth token response
 */
export interface TokenResponse {
  readonly access_token: string;
  readonly token_type: string;
  readonly expires_in?: number;
  readonly refresh_token?: string;
  readonly scope?: string;
}

/**
 * Google-specific user profile
 */
export interface GoogleUserProfile {
  readonly sub: string;
  readonly email: string;
  readonly email_verified: boolean;
  readonly name?: string;
  readonly given_name?: string;
  readonly family_name?: string;
  readonly picture?: string;
}

/**
 * GitHub email information
 */
export interface GitHubEmail {
  readonly email: string;
  readonly primary: boolean;
  readonly verified: boolean;
  readonly visibility?: string;
}

/**
 * GitHub-specific user profile
 */
export interface GitHubUserProfile {
  readonly id: number;
  readonly login: string;
  readonly name?: string;
  readonly email?: string;
  readonly avatar_url?: string;
}

/**
 * Microsoft-specific user profile
 */
export interface MicrosoftUserProfile {
  readonly id: string;
  readonly userPrincipalName: string;
  readonly mail?: string;
  readonly givenName?: string;
  readonly surname?: string;
  readonly displayName?: string;
  readonly photo?: string;
}

/**
 * Apple-specific token response
 */
export interface AppleTokenResponse extends TokenResponse {
  readonly id_token: string;
}

/**
 * Apple-specific user profile
 */
export interface AppleUserProfile {
  readonly sub: string;
  readonly email?: string;
  readonly email_verified?: boolean;
  readonly is_private_email?: boolean;
  readonly name?: {
    readonly firstName?: string;
    readonly lastName?: string;
  };
}

/**
 * Apple ID token structure
 */
export interface AppleIdToken {
  readonly iss: string;
  readonly aud: string;
  readonly exp: number;
  readonly iat: number;
  readonly sub: string;
  readonly email?: string;
  readonly email_verified?: boolean;
  readonly is_private_email?: boolean;
  readonly nonce?: string;
  readonly nonce_supported?: boolean;
  readonly real_user_status?: number;
}
