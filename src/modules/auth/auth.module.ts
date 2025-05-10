import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { LoginAttemptService } from './services/login-attempt.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { TokenService } from './services/token.service';
import { OrganizationsModule } from '../organizations/organizations.module';
import { FingerprintService } from './services/fingerprint.service';
import { OAuthModule } from './oauth/oauth.module';

@Module({
  imports: [
    UsersModule,
    PermissionsModule,
    OrganizationsModule,
    OAuthModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          algorithm: 'HS256',
        },
      }),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: 5, // 5 requests per minute
      },
      {
        name: 'medium',
        ttl: 300000, // 5 minutes
        limit: 100, // 100 requests per 5 minutes
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    // Core services
    AuthService,
    TokenService,
    FingerprintService,
    JwtStrategy,
    LoginAttemptService,
    PermissionGuard,
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
