# Admin Organization Module

## Overview

This module handles system-wide organization management for administrators, providing functionality to manage and oversee all organizations in the system.

## Features

- System-wide organization management
- Organization listing and search
- Organization status management
- Organization settings control

## Directory Structure

```
/organizations
  /controllers    # Organization management endpoints
  /services      # Business logic
  /repositories  # Data access layer
  /interfaces    # Type definitions and contracts
  /dto          # Data transfer objects
  /types        # Type definitions
  /constants    # Constants and enums
```

## Key Components

- `AdminOrganizationController`: REST endpoints for organization management
- `AdminOrganizationService`: Core business logic
- Organization DTOs and interfaces

## Usage

```typescript
@Controller('admin/organizations')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
export class AdminOrganizationController {
  constructor(
    private readonly adminOrganizationService: AdminOrganizationService,
  ) {}

  @Get()
  async findAll() {
    return this.adminOrganizationService.findAll();
  }
}
```

## Permissions

- Requires `SYSTEM_ADMIN` role
- Protected by `SystemAdminGuard`
- All actions are audited
