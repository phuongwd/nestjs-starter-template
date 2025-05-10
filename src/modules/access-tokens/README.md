# Access Tokens Module

This module provides API access token functionality for the application. It allows for the creation, management, and validation of access tokens that can be used for API authentication.

## Overview

The Access Tokens module is a reusable service for managing API access tokens across the application.

## Features

- Create, list, and delete access tokens
- Token-based authentication for API endpoints
- Scope-based authorization for fine-grained access control
- Automatic token expiration and validation
- Standardized error handling with ErrorUtil pattern
- Consistent userId type handling
- Health check endpoint for system monitoring

## Module Architecture

### Components

1. **Models**:

   - Uses the `AccessToken` model from Prisma schema

2. **DTOs**:

   - `CreateAccessTokenDto`: Input type for creating a new token
   - `AccessTokenResponseDto`: Response format for token operations

3. **Service**:

   - `AccessTokenService`: Core service for token management
   - Implements the `IAccessTokenService` interface
   - Handles creating, listing, deleting, and validating tokens
   - Uses standardized error handling with `ErrorUtil`
   - Consistent userId type handling with normalization

4. **Repository**:

   - `AccessTokenRepository`: Implements data access operations
   - Extends BaseRepository for common CRUD operations
   - Implements the `IAccessTokenRepository` interface

5. **Controller**:

   - `AccessTokenController`: REST API for token management
   - Endpoints for creating, listing, and deleting tokens
   - Protected by the `@Auth()` decorator
   - Includes health check endpoint

6. **Interfaces**:

   - `IAccessTokenService`: Contract for the service implementation
   - `IAccessTokenRepository`: Contract for the repository implementation

7. **Module**:
   - `AccessTokensModule`: Exports the service and related components for use in other modules

## Usage

### Module Import

```typescript
import { AccessTokensModule } from '@/modules/access-tokens/access-tokens.module';

@Module({
  imports: [AccessTokensModule],
  // ...
})
export class YourModule {}
```

### Using the AccessTokenService

```typescript
import { IAccessTokenService } from '@/modules/access-tokens/interfaces/service.interface';
import { ACCESS_TOKEN_INJECTION_TOKENS } from '@/modules/access-tokens/constants/injection-tokens';
import { CreateAccessTokenDto } from '@/modules/access-tokens/dto/access-token.dto';

@Injectable()
export class YourService {
  constructor(
    @Inject(ACCESS_TOKEN_INJECTION_TOKENS.SERVICE.ACCESS_TOKEN)
    private readonly accessTokenService: IAccessTokenService,
  ) {}

  async createToken(userId: number, dto: CreateAccessTokenDto) {
    return this.accessTokenService.createToken(userId, dto);
  }

  async validateToken(token: string, requiredScopes: string[]) {
    return this.accessTokenService.validateToken(token, requiredScopes);
  }
}
```

### Protecting Routes with Auth Decorator

```typescript
import { Controller, Get } from '@nestjs/common';
import { Auth } from '@/shared/decorators/auth.decorator';

@Controller('api/protected')
@Auth()
export class ProtectedController {
  @Get()
  getData() {
    return { message: 'This route is protected by authentication' };
  }
}
```

## API Endpoints

The module exposes the following REST API endpoints:

- `POST /api/tokens` - Create a new access token
- `GET /api/tokens` - List all access tokens for the current user
- `DELETE /api/tokens/:id` - Delete an access token by ID
- `GET /api/tokens/test` - Health check endpoint

## Database Schema

The module uses the `AccessToken` model in the Prisma schema:

```prisma
model AccessToken {
  id          String    @id @default(uuid())
  name        String
  token       String    @unique
  userId      Int
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  description String?
  createdAt   DateTime  @default(now())
  expiresAt   DateTime?
  lastUsedAt  DateTime?
  scope       String[]  @default(["all"])

  @@unique([userId, name])
  @@index([token])
  @@map("access_tokens")
}
```

## Error Handling

The module uses the `ErrorUtil` pattern for standardized error handling:

- All service methods are wrapped in try/catch blocks
- Errors are logged consistently with context information
- Custom exceptions are used for different error scenarios
- Repository operations use specialized error handling

Example:

```typescript
try {
  // Operation logic
} catch (error: unknown) {
  return ErrorUtil.handleError(
    error,
    this.logger,
    `Failed to get access tokens for user ${userId}`,
  );
}
```

## Type Consistency

The module ensures consistent type handling:

- `userId` is normalized to always be a number internally
- DTOs provide proper validation for inputs
- Response objects have consistent types
- The `AccessToken` type from Prisma is used as the base type

## Security Considerations

- Token values are only returned once at creation time
- Tokens can be scoped to limit access to specific resources
- Tokens can be set to expire after a specified time
- Token usage is tracked for audit purposes
- Authentication is enforced at the controller level
- Error messages don't leak sensitive information

## Recent Improvements

1. **Enhanced Error Handling** - Implemented the ErrorUtil pattern for standardized error handling across all methods
2. **Standardized UserId Type** - Added a normalizeUserId utility method to ensure consistent type handling
3. **Improved Controller Security** - Updated with the @Auth() decorator for consistent security
4. **Health Check Endpoint** - Added a dedicated endpoint for system monitoring
5. **Consistent Method Naming** - Renamed methods to follow verb-first naming convention (e.g., getTokens instead of listTokens)
6. **Updated Documentation** - Comprehensive README with usage examples and security considerations

## Next Steps

1. **Testing**:

   - Add unit tests for the AccessTokenService
   - Add integration tests for the API endpoints

2. **Additional Features**:

   - Implement token revocation
   - Add rate limiting for token validation
   - Add audit logging for token usage

3. **Integration**:
   - Connect with other modules that need API authentication
   - Create specialized guards for different API areas
