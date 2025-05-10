import {
  Module,
  OnApplicationBootstrap,
  Logger,
  MiddlewareConsumer,
  NestModule,
  ExecutionContext,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DomainRoutingMiddleware } from './modules/custom-domain/middleware/domain-routing.middleware';
import { CacheModule } from '@nestjs/cache-manager';
import { Request } from 'express';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TimingInterceptor } from './shared/interceptors/timing.interceptor';

// Environment constants
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_DEVELOPMENT = NODE_ENV === 'development';

// Core modules
import { CoreModule } from '@/core/core.module';
import { LoggerModule } from '@/core/logger/logger.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisModule } from '@/core/redis/redis.module';

// Shared modules
import { SharedModule } from './shared/shared.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { SystemModule } from './modules/system/system.module';
import { HealthModule } from './modules/health/health.module';
import { CustomDomainModule } from './modules/custom-domain/custom-domain.module';
import { AdminModule } from './modules/admin/admin.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { PrometheusModule } from './modules/prometheus/prometheus.module';
import { PrometheusMiddleware } from './modules/prometheus/prometheus.middleware';
import { AccessTokensModule } from './modules/access-tokens/access-tokens.module';

// Services
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SystemInitService } from './modules/system/system-init.service';

// Configuration
import configuration from './config/configuration';

type ThrottlerRequest = Request & {
  headers: {
    'user-agent'?: string;
  };
};

/**
 * Root module of the application.
 * Organizes imports in the following order:
 * 1. Configuration modules
 * 2. Core modules
 * 3. Shared modules (global features)
 * 4. Feature modules
 */
@Module({
  imports: [
    // 1. Configuration
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 3600000,
      max: 100,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 1000,
        },
        {
          ttl: 5000,
          limit: 200,
          ignoreUserAgents: [
            /^health-check/,
            /^ELB-HealthChecker/,
            /^kube-probe/,
          ],
        },
      ],
      skipIf: (context: ExecutionContext): boolean => {
        const request = context.switchToHttp().getRequest<ThrottlerRequest>();
        const userAgent = request.headers['user-agent'] || '';
        const path = request.path || '';

        // Skip throttling for metrics endpoints
        if (
          path === '/metrics' ||
          path.startsWith('/metrics/') ||
          path.includes('check_path=%2Fmetrics')
        ) {
          return true;
        }

        if (
          userAgent.startsWith('health-check') ||
          userAgent.startsWith('ELB-HealthChecker') ||
          userAgent.startsWith('kube-probe')
        ) {
          return true;
        }

        if (path === '/health/quick' && request.ip === '127.0.0.1') {
          return true;
        }

        // Skip throttling in development mode
        if (IS_DEVELOPMENT) {
          return true;
        }

        return false;
      },
    }),

    // 2. Core modules
    CoreModule,
    LoggerModule,
    PrismaModule,
    RedisModule,

    // 3. Shared module (global features)
    SharedModule,

    // 4. Feature modules
    SystemModule,
    AuthModule,
    UsersModule,
    HealthModule,
    PermissionsModule,
    OrganizationsModule,
    SubscriptionsModule,
    CustomDomainModule,
    AdminModule,
    MonitoringModule,
    PrometheusModule,
    AccessTokensModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TimingInterceptor,
    },
  ],
})
export class AppModule implements OnApplicationBootstrap, NestModule {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly systemInitService: SystemInitService) {}

  /**
   * Initialize system when the application starts
   * This is safer than using a seed script because:
   * 1. It runs after all modules are initialized
   * 2. It's idempotent (safe to run multiple times)
   * 3. It's part of the application lifecycle
   * 4. It uses the same configuration as the app
   */
  async onApplicationBootstrap() {
    try {
      this.logger.log('=== Application bootstrap started ===');
      this.logger.log('Initializing system...');

      await this.systemInitService.initializeSystem();

      this.logger.log('=== System initialization completed successfully ===');
    } catch (error: unknown) {
      this.logger.error('=== System initialization failed ===');
      if (error instanceof Error) {
        this.logger.error('Error details:', error.message);
        this.logger.error('Stack trace:', error.stack);
      } else {
        this.logger.error('Error details:', error);
      }
      throw error;
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DomainRoutingMiddleware).forRoutes('*'); // Apply to all routes
    consumer.apply(PrometheusMiddleware).forRoutes('*');
  }
}
