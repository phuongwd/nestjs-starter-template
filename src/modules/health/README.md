# Health Module

## Overview

The Health Module provides comprehensive health check functionality for the NanoE platform, implementing both detailed and quick health checks. It follows NestJS best practices and uses the `@nestjs/terminus` health check library.

## Features

- **Two-tier Health Checks**:
  - Full health check (`/health`)
  - Quick health check (`/health/quick`)
- **Monitored Components**:
  - Database connectivity and responsiveness
  - Disk space usage
- **Performance Optimizations**:
  - Result caching (1-second interval)
  - Connection pooling
  - Timeout handling
- **Security**:
  - Rate limiting protection
  - User agent filtering
  - IP-based throttling exceptions

## Architecture

### Core Components

```typescript
@Module({
  imports: [
    TerminusModule.forRoot({
      errorLogStyle: 'pretty',
    }),
    PrismaModule,
    ConfigModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: CHECK_DISK_SPACE,
      useValue: checkDiskSpace,
    },
    PrismaHealthIndicator,
    HealthService,
  ],
})
export class HealthModule {}
```

### Key Classes

- `HealthController`: Exposes health check endpoints
- `HealthService`: Orchestrates health checks
- `PrismaHealthIndicator`: Handles database health checks
- `CheckDiskSpaceFunction`: Manages disk space monitoring

## Configuration

### Default Health Check Configuration

```typescript
export const DEFAULT_HEALTH_CONFIG: HealthCheckConfig = {
  database: {
    timeoutMs: 1000, // 1 second timeout
    retryIntervalMs: 1000, // 1 second between retries
    maxRetries: 3, // Maximum retries
  },
  disk: {
    pathToCheck: '/', // Root path
    thresholdPercent: 90, // Alert threshold
  },
};
```

### Rate Limiting Configuration

```typescript
{
  ttl: 5000,  // 5 seconds
  limit: 20,  // 20 requests per 5 seconds
  ignoreUserAgents: [/^health-check/, /^ELB-HealthChecker/, /^kube-probe/],
}
```

## API Endpoints

### Full Health Check

```http
GET /health
```

**Response Example**:

```json
{
  "data": {
    "status": "ok",
    "info": {
      "database": {
        "status": "up",
        "responseTime": "40ms"
      },
      "disk": {
        "status": "up",
        "details": {
          "total": "98GB",
          "free": "58GB",
          "used": "40%"
        }
      }
    },
    "error": {},
    "details": {
      "database": {
        "status": "up",
        "responseTime": "40ms"
      },
      "disk": {
        "status": "up",
        "details": {
          "total": "98GB",
          "free": "58GB",
          "used": "40%"
        }
      }
    },
    "duration": "40ms"
  },
  "metadata": {
    "timestamp": "2025-02-20T04:45:04.781Z",
    "path": "/health"
  }
}
```

### Quick Health Check

```http
GET /health/quick
```

**Response Example**:

```json
{
  "data": {
    "status": "ok",
    "timestamp": 1740026714492,
    "duration": "15ms"
  },
  "metadata": {
    "timestamp": "2025-02-20T04:45:14.508Z",
    "path": "/health/quick"
  }
}
```

## Error Handling

### Database Errors

- Connection timeouts
- Query timeouts
- Connection refused
- Authentication failures

### Disk Space Errors

- Permission denied
- Device not found
- I/O errors

## Best Practices

1. **Health Check Usage**:

   - Use quick check for high-frequency monitoring
   - Use full check for detailed system status
   - Implement circuit breakers for failing components

2. **Monitoring Setup**:

   - Set up alerts for repeated failures
   - Monitor response times for degradation
   - Track disk space trends

3. **Security Considerations**:
   - Limit access to health endpoints
   - Monitor for abuse patterns
   - Configure appropriate rate limits

## Integration Examples

### Kubernetes Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /health/quick
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 30
  timeoutSeconds: 5
  failureThreshold: 3
```

### Docker Healthcheck

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/quick || exit 1
```

## Troubleshooting

### Common Issues

1. **Slow Health Checks**

   - Check database connection pool
   - Verify disk I/O performance
   - Monitor system resources

2. **False Positives**

   - Adjust timeout values
   - Review retry settings
   - Check threshold configurations

3. **Rate Limiting Issues**
   - Verify client IP detection
   - Check user agent patterns
   - Review rate limit settings

## Contributing

When contributing to the Health Module:

1. Follow the established patterns
2. Add tests for new health indicators
3. Document configuration options
4. Update this README for significant changes

## Testing

```bash
# Unit tests
npm run test src/modules/health

# E2E tests
npm run test:e2e src/modules/health

# Test coverage
npm run test:cov src/modules/health
```
