import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { SetupCompletionDto } from '../dto/setup-completion.dto';

/**
 * Validation pipe for setup operations
 * @description Validates and sanitizes setup data
 */
@Injectable()
export class SetupValidationPipe implements PipeTransform<unknown, unknown> {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (!value) {
      throw new BadRequestException('No data provided');
    }

    // If validating setup completion data
    if (value instanceof SetupCompletionDto) {
      this.validateSetupCompletion(value);
    }

    // If validating token
    if (metadata.data === 'token' && typeof value === 'string') {
      this.validateToken(value);
    }

    return value;
  }

  private validateSetupCompletion(data: SetupCompletionDto) {
    // Validate email
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate password
    if (!data.password || data.password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    // Validate names
    if (!data.firstName || !data.firstName.trim()) {
      throw new BadRequestException('First name is required');
    }
    if (!data.lastName || !data.lastName.trim()) {
      throw new BadRequestException('Last name is required');
    }

    // Validate token
    if (!data.setupToken || !/^[a-f0-9]{32}$/.test(data.setupToken)) {
      throw new BadRequestException('Invalid token format');
    }

    // Validate metadata
    if (data.metadata !== undefined) {
      if (typeof data.metadata !== 'object' || data.metadata === null) {
        throw new BadRequestException('Metadata must be an object');
      }
    }

    // Sanitize data
    data.email = data.email.toLowerCase().trim();
    data.firstName = data.firstName.trim();
    data.lastName = data.lastName.trim();
  }

  private validateToken(token: string) {
    if (!token || !/^[a-f0-9]{32}$/.test(token)) {
      throw new BadRequestException('Invalid token format');
    }
  }
}
