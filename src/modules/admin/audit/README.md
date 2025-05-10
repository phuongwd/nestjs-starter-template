# Admin Audit Module

## Overview

This module provides comprehensive audit logging for administrative actions, ensuring accountability and traceability.

## Features

- Audit trail for administrative actions
- Detailed logging with metadata
- User action tracking
- IP and user agent logging

## Directory Structure

```
/audit
  /services       # Audit logging services
  /repositories   # Data access layer
  /interfaces     # Type definitions and contracts
  /dto           # Data transfer objects
  /types         # Type definitions
  /constants     # Constants and enums
```

## Key Components

- `AdminAuditService`: Core audit logging service
- `AdminAuditRepository`: Handles audit log persistence
- `IAdminAuditRepository`: Repository interface

## Usage

```typescript
@Injectable()
export class YourService {
  constructor(private readonly auditService: AdminAuditService) {}

  async performAction(req: RequestWithUser) {
    // Log the action
    await this.auditService.logActionFromRequest(
      req,
      'CREATE',
      'resource',
      'resourceId',
      { metadata: 'value' },
    );
  }
}
```

## Audit Log Types

- User Management
- Organization Management
- System Configuration
- Security Events
- Access Control Changes
