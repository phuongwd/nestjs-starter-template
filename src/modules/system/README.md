# System Module

## Overview

The System Module handles core system initialization and maintenance tasks for both cloud and self-hosted deployments. It manages license validation, system configuration, and essential data initialization while respecting deployment-specific requirements.

## Key Features

- License validation for self-hosted deployments
- Automatic system initialization during application startup
- Deployment-aware configuration (cloud vs self-hosted)
- Idempotent operations (safe to run multiple times)
- Built-in logging and error handling

## Core Components

### SystemModule (`system.module.ts`)

The main module that provides system initialization capabilities:

```typescript
@Module({
  imports: [PrismaModule],
  providers: [SystemInitService],
  exports: [SystemInitService],
})
export class SystemModule {}
```

### SystemInitService (`system-init.service.ts`)

Handles the initialization of core system data:

- License validation and management
- Permissions and roles
- Deployment-specific configurations
- System settings based on license tier

## How It Works

### 1. Deployment Configuration

The system needs to be configured with the appropriate deployment type and license:

```env
# .env file
DEPLOYMENT_TYPE=self-hosted  # or 'cloud'
LICENSE_KEY=your-license-key # required for self-hosted
```

### 2. Application Bootstrap

When the application starts, the `SystemInitService` performs initialization:

```typescript
export class AppModule implements OnApplicationBootstrap {
  constructor(private readonly systemInitService: SystemInitService) {}

  async onApplicationBootstrap() {
    await this.systemInitService.initializeSystem();
  }
}
```

### 3. System Initialization Process

#### a. License Validation (Self-hosted Only)

- Validates license key
- Determines feature availability
- Sets up license-specific configurations

#### b. Permission Initialization

- Creates default permissions if they don't exist
- Updates existing permissions if needed
- Permissions are organized by resource type

#### c. System Roles Setup

- Creates default system roles
- Associates roles with appropriate permissions
- Ensures role hierarchy is maintained

#### d. License Settings (Self-hosted Only)

- Initializes user limits
- Sets up feature flags
- Configures custom branding
- Sets API rate limits

## Self-Hosted vs Cloud Deployment

### Self-Hosted Deployment

1. **License Requirements**

   - Valid license key required
   - License determines available features
   - Custom configurations allowed

2. **Configuration Options**

   - Custom branding
   - User limits based on license
   - Self-managed updates
   - Data retention control

3. **Security Considerations**
   - Local data storage
   - Custom security policies
   - Network isolation options

### Cloud Deployment

1. **Managed Service**

   - Automatic updates
   - Managed scaling
   - Built-in monitoring

2. **Configuration**
   - Standard feature set
   - Automatic backups
   - Managed security

## Example Usage

### Self-Hosted Initialization

```typescript
@Injectable()
export class SystemInitService {
  async initializeSystem(): Promise<void> {
    // Validate license
    await this.validateLicense();

    // Initialize based on license tier
    await this.initializePermissions();
    await this.initializeSystemRoles();
    await this.initializeLicenseSettings();
  }
}
```

### License Validation

```typescript
private async validateLicense(): Promise<void> {
  const licenseKey = this.configService.get('LICENSE_KEY');
  if (!licenseKey) {
    throw new Error('License key required');
  }
  // Validate license and setup features
}
```

## Best Practices

1. **License Management**

   - Secure license key storage
   - Regular license validation
   - Grace period handling
   - Clear error messages

2. **Data Initialization**

   - Idempotent operations
   - Version control for schemas
   - Data migration support
   - Backup before changes

3. **Security**

   - Secure license validation
   - Role-based access control
   - Audit logging
   - Data encryption

4. **Maintenance**
   - Update documentation
   - Version control changes
   - Monitor system health
   - Regular backups

## Troubleshooting

### Common Issues

1. **License Issues**

   - Invalid license key
   - Expired license
   - Feature not available
   - License validation fails

2. **Initialization Fails**

   - Database connection
   - Permission issues
   - Configuration errors

3. **Missing Features**
   - License tier limitations
   - Configuration issues
   - Missing dependencies

### Logging

The service uses NestJS Logger for detailed logging:

```typescript
this.logger.log('License validated successfully');
this.logger.error('License validation failed:', error);
```

## Future Improvements

- [ ] Add license management interface
- [ ] Implement feature flags system
- [ ] Add license usage analytics
- [ ] Create upgrade path automation
- [ ] Add multi-tenant support for enterprise licenses
