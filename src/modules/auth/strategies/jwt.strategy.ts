import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../types/jwt.types';
import { UserWithoutPassword } from '../../users/types/user.type';
import { AUTH_ERROR_MESSAGES } from '../constants/auth.constant';
import { TokenService } from '../services/token.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<UserWithoutPassword> {
    try {
      // 1. Extract and validate token
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      if (!token) {
        this.logger.warn('No token found in request');
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_TOKEN);
      }

      this.logger.debug('Request headers:', {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        xForwardedFor: req.headers['x-forwarded-for'],
        remoteAddress: req.socket.remoteAddress,
      });

      // 2. Validate token security features
      const isValid = await this.tokenService.validateToken(token, req);

      if (!isValid) {
        this.logger.warn(`Token validation failed for user ${payload.sub}`);
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_TOKEN);
      }

      // 3. Get user
      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        this.logger.warn(
          `JWT validation failed: User ${payload.sub} not found`,
        );
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
      }

      return user;
    } catch (error: unknown) {
      this.logger.error(
        `JWT validation error for user ${payload.sub}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.UNAUTHORIZED);
    }
  }
}
