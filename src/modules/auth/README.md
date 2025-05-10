# Authentication Module

## Overview

The Authentication Module provides a secure, enterprise-grade authentication system for multi-tenant SAAS applications. It's designed as a complete starter template with enterprise-grade features, supporting both traditional email/password authentication and OAuth-based social authentication.

This module is built for multi-tenant SAAS applications, with features specifically designed for:

- B2B SAAS applications requiring organization management
- Multi-tenant data isolation
- Enterprise-grade security
- Scalable user management
- Professional OAuth integration

## Features

### Core Authentication

- ✅ JWT-based authentication with refresh tokens
- ✅ Secure password hashing with bcrypt
- ✅ Request fingerprinting for token security
- ✅ Rate limiting for sensitive endpoints
- ✅ Login attempt tracking and account locking
- ✅ Comprehensive error handling and logging
- ✅ TypeScript decorators for route protection
- ✅ Password reset functionality
- ✅ Session management
- ✅ IP-based security

### OAuth Authentication

- ✅ Multiple OAuth providers:
  - Google (`GoogleAuthProvider`)
  - GitHub (`GitHubAuthProvider`)
  - Microsoft (`MicrosoftAuthProvider`)
  - Apple (`AppleAuthProvider`)
- ✅ Platform-specific handling:
  - Web
  - iOS native
  - Android native
- ✅ PKCE support for Apple Sign In
- ✅ State parameter validation with Redis
- ✅ User profile synchronization
- ✅ Provider-specific error handling
- ✅ Automatic profile merging
- ✅ Custom claims mapping

### Security Features

- ✅ Token fingerprinting with User-Agent validation
- ✅ Rate limiting with configurable thresholds
- ✅ CSRF protection via state parameters
- ✅ Secure token storage and rotation
- ✅ Platform-specific error handling
- ✅ Audit logging for security events
- ✅ Account locking after failed attempts
- ✅ IP-based rate limiting
- ✅ Device tracking
- ✅ Security event notifications

## Module Structure

```
auth/
├── constants/
│   └── auth.constant.ts         # Authentication constants and messages
├── dto/
│   ├── auth-response.dto.ts     # Authentication response data
│   ├── login.dto.ts            # Login request data
│   ├── refresh-token.dto.ts    # Token refresh request
│   └── tokens.dto.ts           # Token response data
├── exceptions/
│   └── auth.exception.ts       # Custom authentication exceptions
├── guards/
│   └── jwt-auth.guard.ts       # JWT authentication guard
├── interfaces/
│   └── oauth.interface.ts      # OAuth interfaces and types
├── oauth/
│   ├── constants/
│   │   └── injection-tokens.ts # OAuth dependency injection tokens
│   ├── interfaces/
│   │   ├── oauth.interface.ts  # OAuth provider interfaces
│   │   └── oauth-user-repository.interface.ts
│   ├── providers/
│   │   ├── google-auth.provider.ts
│   │   ├── github-auth.provider.ts
│   │   ├── microsoft-auth.provider.ts
│   │   └── apple-auth.provider.ts
│   ├── repositories/
│   │   └── oauth-user.repository.ts
│   ├── services/
│   │   ├── oauth-provider.service.ts
│   │   └── oauth-state.service.ts
│   └── oauth.module.ts
├── services/
│   ├── fingerprint.service.ts  # Request fingerprinting
│   ├── login-attempt.service.ts # Login attempt tracking
│   └── token.service.ts        # Token management
├── strategies/
│   └── jwt.strategy.ts         # Passport JWT strategy
├── types/
│   └── jwt.types.ts           # JWT payload types
├── auth.controller.ts         # Authentication endpoints
├── auth.service.ts           # Core authentication logic
└── auth.module.ts            # Module configuration
```

## Key Components

### AuthService

The main service handling:

- User authentication and registration
- Token generation and validation
- Password management
- OAuth integration
- Security features
- Audit logging

```typescript
@Injectable()
export class AuthService {
  async login(loginDto: LoginDto, req: Request): Promise<AuthResponseDto> {
    // Validate credentials
    // Generate tokens
    // Track login attempt
    // Return response
  }

  async register(
    createUserDto: CreateUserDto,
    req: Request,
  ): Promise<AuthResponseDto> {
    // Validate registration data
    // Create user
    // Generate tokens
    // Return response
  }
}
```

### OAuth System

A modular OAuth implementation that:

- Supports multiple providers
- Handles provider-specific authentication flows
- Manages user profile synchronization
- Provides consistent interface across providers
- Handles platform-specific requirements

```typescript
@Injectable()
export class OAuthProviderService {
  getProviders(): Map<string, IOAuthProvider> {
    // Initialize and configure providers
    // Handle provider-specific setup
    // Return available providers
  }
}
```

### Security Services

- `TokenService`: Manages JWT tokens

  ```typescript
  async createTokens(user: UserWithoutPassword, req: Request): Promise<TokensDto> {
    // Generate access and refresh tokens
    // Add fingerprint
    // Set expiration
    // Store token metadata
  }
  ```

- `FingerprintService`: Handles request fingerprinting

  ```typescript
  generateFingerprint(req: Request): string {
    // Generate unique fingerprint
    // Include device information
    // Add security metadata
  }
  ```

- `LoginAttemptService`: Tracks and limits login attempts

  ```typescript
  async recordFailedAttempt(email: string): Promise<void> {
    // Track failed attempts
    // Implement lockout policy
    // Send security notifications
  }
  ```

- `OAuthStateService`: Manages OAuth state validation
  ```typescript
  async validateState(state: string, metadata: OAuthStateMetadata): Promise<void> {
    // Validate state token
    // Check metadata
    // Ensure security requirements
  }
  ```

## API Endpoints

### Traditional Authentication

```typescript
// Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "secure_password"
}

// Register
POST /auth/register
{
  "email": "new@example.com",
  "password": "secure_password",
  "firstName": "John",
  "lastName": "Doe"
}

// Refresh Token
POST /auth/refresh
{
  "refresh_token": "your_refresh_token"
}

// Get Profile
GET /auth/profile
Authorization: Bearer your_access_token

// Password Reset
POST /auth/password/reset
{
  "email": "user@example.com"
}

// Change Password
POST /auth/password/change
Authorization: Bearer your_access_token
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

### OAuth Authentication

```typescript
// Get Available Providers
GET /auth/oauth/providers

// Get Provider Authorization URL
GET /auth/oauth/:provider/url?platform=web|ios|android

// Handle OAuth Callback
GET /auth/oauth/:provider/callback

// Handle Apple Android Callback
POST /auth/oauth/apple/android-callback
{
  "code": "authorization_code",
  "state": "state_token",
  "user": "user_data_json" // Optional, for first-time login
}
```

## Configuration

Required environment variables:

```env
# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=3600
TOKEN_VERSION_TTL=604800
TOKEN_REVOCATION_TTL=86400
ACCESS_TOKEN_TTL=900
REFRESH_TOKEN_TTL=604800

# Security Configuration
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900
REQUIRE_2FA=false
PASSWORD_MIN_LENGTH=8

# Redis Configuration (for state management)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

# OAuth Providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback/google

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/callback/github

MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/callback/microsoft
MICROSOFT_TENANT_ID=your_tenant_id

APPLE_CLIENT_ID=your_apple_client_id
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY=your_apple_private_key
APPLE_REDIRECT_URI=http://localhost:3000/auth/callback/apple
```

## Security Implementation

### Token Security

- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Token fingerprinting using User-Agent
- Token rotation on refresh
- Redis-based token blacklisting
- JWT payload encryption
- Token version control

### Rate Limiting

```typescript
// Login endpoint
@Throttle({
  default: {
    limit: AUTH_CONSTANTS.LOGIN_THROTTLE_LIMIT,
    ttl: AUTH_CONSTANTS.LOGIN_THROTTLE_TTL,
  },
})

// OAuth endpoints
@Throttle({ default: { ttl: 60000, limit: 5 } })

// IP-based rate limiting
@UseGuards(IpRateLimitGuard)
```

### OAuth State Validation

```typescript
// State generation with metadata
const state = await oauthStateService.generateState({
  provider,
  clientIp: req.ip,
  userAgent: req.headers['user-agent'],
  platform,
  timestamp: Date.now(),
  nonce: crypto.randomBytes(16).toString('hex'),
});

// State validation with security checks
await oauthStateService.validateState(state, {
  provider,
  platform,
  maxAge: 5 * 60 * 1000, // 5 minutes
});
```

## Error Handling

The module implements comprehensive error handling:

- Custom exceptions for authentication scenarios
- Platform-specific error messages
- Detailed error logging with stack traces
- Rate limit notifications
- Audit logging for security events
- User-friendly error responses
- Security event notifications

### Error Types

```typescript
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number,
  ) {
    super(message);
  }
}

// Usage examples
throw new InvalidCredentialsError();
throw new AccountLockedError();
throw new OAuthProviderError('google', 'invalid_token');
```

## Usage Example

```typescript
// Module import
@Module({
  imports: [
    AuthModule.forRoot({
      // Optional configuration
      jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRATION,
      },
      oauth: {
        enabled: true,
        providers: ['google', 'github', 'microsoft', 'apple'],
      },
      security: {
        maxLoginAttempts: 5,
        lockoutDuration: 900,
        requireTwoFactor: false,
      },
    }),
  ],
})
// Controller usage
@Controller('protected')
@UseGuards(JwtAuthGuard)
export class ProtectedController {
  @Get()
  @Auth() // Custom decorator for authentication
  @RequirePermissions(['read:resource'])
  getProtectedResource() {
    // Your protected route logic
  }
}

// Service usage
@Injectable()
export class UserService {
  constructor(private readonly authService: AuthService) {}

  async createUser(data: CreateUserDto) {
    // Create user
    // Handle authentication
    // Manage permissions
  }
}
```

## Testing

The module includes comprehensive tests:

### Unit Tests

```typescript
describe('AuthService', () => {
  it('should authenticate valid credentials', async () => {
    // Test implementation
  });

  it('should handle failed login attempts', async () => {
    // Test implementation
  });
});
```

### Integration Tests

```typescript
describe('OAuth Flow', () => {
  it('should complete Google authentication', async () => {
    // Test implementation
  });
});
```

### E2E Tests

```typescript
describe('Authentication API', () => {
  it('should handle complete login flow', async () => {
    // Test implementation
  });
});
```

## Contributing

When contributing to this module:

1. Follow the TypeScript guidelines
2. Add tests for new features
3. Update documentation
4. Follow security best practices
5. Test all OAuth providers
6. Maintain backward compatibility
7. Update security measures
8. Document API changes

## Troubleshooting

Common issues and solutions:

1. Token Validation Failures

   - Check token expiration
   - Verify fingerprint
   - Validate token version

2. OAuth Integration Issues

   - Verify provider configuration
   - Check callback URLs
   - Validate state parameters

3. Rate Limiting Problems
   - Review rate limit settings
   - Check IP allowlist
   - Monitor usage patterns

## License

This module is part of the SAAS platform and is covered by the platform's license agreement.

## Support

For issues and feature requests:

1. Check the troubleshooting guide
2. Review existing issues
3. Submit detailed bug reports
4. Contact support team
