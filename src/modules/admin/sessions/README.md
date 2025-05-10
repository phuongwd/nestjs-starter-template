# Admin Session Module

## Overview

This module handles administrative session management, including session creation, validation, and cleanup.

## Features

- Session creation and validation
- Session token management
- Session cleanup and expiration
- Redis-based session caching

## Directory Structure

```
/sessions
  /controllers     # Session-related controllers
  /services       # Session management services
  /repositories   # Data access layer
  /interfaces     # Type definitions and contracts
  /dto           # Data transfer objects
  /types         # Type definitions
  /constants     # Constants and enums
  /guards        # Session-related guards
```

## Key Components

- `AdminSessionService`: Manages session lifecycle
- `AdminSessionGuard`: Protects admin routes
- `AdminSessionRepository`: Handles session persistence

## Usage

```typescript
// Using the session guard
@UseGuards(AdminSessionGuard)
export class AdminController {
  // Protected routes
}

// Using the session service
@Injectable()
export class YourService {
  constructor(private readonly sessionService: AdminSessionService) {}

  async someMethod() {
    const session = await this.sessionService.createSession({
      userId: 1,
      ipAddress: '127.0.0.1',
    });
  }
}
```
