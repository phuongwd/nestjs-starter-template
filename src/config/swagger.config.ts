import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

/**
 * Configure Swagger documentation for the API
 * @param app - NestJS application instance
 * @param configService - ConfigService instance for accessing environment variables
 */
export function setupSwagger(
  app: INestApplication,
  configService: ConfigService,
): void {
  const appUrl =
    configService.get<string>('app.url') || 'http://localhost:3001';
  const apiVersion = configService.get<string>('api.currentVersion') || '1';
  const appName = configService.get<string>('app.name') || 'SAASQALI';
  const appDescription =
    configService.get<string>('app.description') ||
    'Multi-tenant SAAS Platform API';

  const config = new DocumentBuilder()
    .setTitle(`${appName} API`)
    .setDescription(appDescription)
    .setVersion(apiVersion)
    // JWT Authentication
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'JWT-auth',
    )
    // Required Headers for Security
    .addApiKey(
      {
        type: 'apiKey',
        name: 'User-Agent',
        in: 'header',
        description:
          'Client user agent string used for request fingerprinting and security validation',
      },
      'User-Agent',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-Forwarded-For',
        in: 'header',
        description:
          'Client IP address used for request fingerprinting and rate limiting',
      },
      'X-Forwarded-For',
    )
    // API Tags
    .addTag('Authentication', 'Authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Organizations', 'Organization management endpoints')
    .addTag('Domains', 'Custom domain management endpoints')
    .addTag('Subscriptions', 'Subscription management endpoints')
    .addServer(appUrl, 'Local Development')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      displayRequestDuration: true,
      docExpansion: 'none',
    },
    customSiteTitle: 'API Documentation',
  });
}
