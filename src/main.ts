import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { StartupLogger } from './core/logger/startup.logger';
import { setupSwagger } from './config/swagger.config';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';

// Environment constants
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_DEVELOPMENT = NODE_ENV === 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
// Uncomment if needed in the future
// const IS_TEST = NODE_ENV === 'test';

interface ApiConfig {
  version: string;
  prefix: string;
  fullPrefix: string;
}

interface StartupConfig {
  port: number;
  apiVersion: string;
  environment: string;
  apiPrefix: string;
  baseUrl: string;
}

// Main function to bootstrap the application
async function bootstrap(): Promise<void> {
  const useHttps = IS_DEVELOPMENT && process.env.USE_HTTPS === 'true';
  const appLogger = new Logger('Bootstrap');

  // HTTPS options for local development
  const httpsOptions = useHttps
    ? {
        key: fs.readFileSync(path.join(process.cwd(), 'ssl/server.key')),
        cert: fs.readFileSync(path.join(process.cwd(), 'ssl/server.crt')),
      }
    : undefined;

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      process.env.LOG_LEVEL === 'debug'
        ? ['debug', 'log', 'warn', 'error']
        : ['log', 'warn', 'error'],
    httpsOptions,
  });
  const configService = app.get(ConfigService);
  const apiVersion = configService.get<string>('api.currentVersion') || '1';
  const apiPrefix = configService.get<string>('api.prefix') || 'api/v';

  // Enable API versioning first, before any other middleware
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
    prefix: apiPrefix,
  });

  // Trust proxy for X-Forwarded-For header in production environments
  if (IS_PRODUCTION) {
    app.set('trust proxy', 'loopback, linklocal, uniquelocal');
    appLogger.log('Trust proxy enabled for production environment');
  }

  // Log API configuration
  const apiConfig: ApiConfig = {
    version: apiVersion,
    prefix: apiPrefix,
    fullPrefix: `${apiPrefix}${apiVersion}`,
  };
  appLogger.log(`API Configuration: ${JSON.stringify(apiConfig)}`);

  // Security - CORS
  app.enableCors({
    origin: IS_DEVELOPMENT
      ? ['http://localhost:8080', 'http://localhost:3000', '*']
      : configService.get<string | string[]>('cors.origin') || true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Organization-Id',
      'X-Skip-Auth-Error',
      'X-Skip-Refresh-Token',
      'sec-ch-ua',
      'sec-ch-ua-mobile',
      'sec-ch-ua-platform',
      'Referer',
      'User-Agent',
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
  });

  // Optional: Add version deprecation check middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const version = req.url.match(/\/api\/v(\d+)\//)?.[1];
    const deprecatedVersions =
      configService.get<string[]>('api.deprecatedVersions') || [];
    if (version && deprecatedVersions.includes(version)) {
      res.setHeader('Warning', '299 - "This API version is deprecated"');
    }
    next();
  });

  // Security - Helmet for security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'", "example.com"],
          "style-src": ["'self'", "https:"],
          "img-src": ["'self'", "data:", "https:"],
          "connect-src": ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: true,
    }),
  );

  // Validation - Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      enableDebugMessages: IS_DEVELOPMENT,
      disableErrorMessages: IS_PRODUCTION,
      validationError: {
        target: false,
        value: true,
      },
    }),
  );

  // Setup Swagger documentation
  setupSwagger(app, configService);

  // Register global exception handlers
  setupProcessHandlers();

  // Listen on port
  const port = configService.get<number>('port') || 3001;
  await app.listen(port);

  // Get startup logger service
  const startupLogger = app.get(StartupLogger);

  // Log startup information
  const startupConfig: StartupConfig = {
    port,
    apiVersion,
    environment: NODE_ENV,
    apiPrefix,
    baseUrl: configService.get<string>('app.url') || `http://localhost:${port}`,
  };
  startupLogger.logStartupInfo(startupConfig);
}

/**
 * Configure global process exception handlers
 */
function setupProcessHandlers(): void {
  const shutdownLogger = new Logger('Shutdown');
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    shutdownLogger.error('Uncaught Exception:', error.stack || error.message);
    // Optional: graceful shutdown logic
    // process.exit(1); // Consider exiting after logging for critical errors
  });

  // Handle unhandled promise rejections
  process.on(
    'unhandledRejection',
    (reason: unknown, promise: Promise<unknown>) => {
      shutdownLogger.error(
        `Unhandled Rejection at: ${JSON.stringify(promise)}, reason: ${reason}`,
      );
      // Optional: graceful shutdown logic
      // process.exit(1);
    },
  );

  // Handle graceful shutdown signals
  process.on('SIGTERM', () => {
    shutdownLogger.log('SIGTERM received, shutting down gracefully');
    // Optional: cleanup logic
    // app.close().then(...).catch(...);
    process.exit(0);
  });
}

void bootstrap();
