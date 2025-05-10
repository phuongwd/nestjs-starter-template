import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { FEATURE_FLAG_KEY } from '../decorators/feature-flag.decorator';
import { FeatureFlagsConfig } from '@config/feature-flags.config';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const feature = this.reflector.get<keyof FeatureFlagsConfig>(
      FEATURE_FLAG_KEY,
      context.getHandler(),
    );

    if (!feature) {
      return true; // No feature flag required
    }

    const features = this.configService.get<FeatureFlagsConfig>('features');
    if (!features) {
      throw new Error('Feature flags configuration not found');
    }

    // Check if feature exists and is enabled
    const isEnabled = features[feature]?.enabled;

    if (!isEnabled) {
      throw new ForbiddenException(`Feature '${feature}' is not available`);
    }

    return true;
  }
}
