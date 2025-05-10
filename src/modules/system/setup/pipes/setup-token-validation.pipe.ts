import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { SETUP_TOKEN_LENGTH } from '../constants/setup.constants';

/**
 * Validation pipe for setup tokens
 * @description Validates setup token format and length
 */
@Injectable()
export class SetupTokenValidationPipe implements PipeTransform {
  /**
   * Transform and validate setup token
   * @param value The token value to validate
   * @param _metadata Argument metadata (unused)
   * @returns The validated token
   * @throws BadRequestException if token is invalid
   */
  transform(value: unknown, _metadata: ArgumentMetadata): string {
    // Handle undefined/null
    if (!value) {
      throw new BadRequestException('Setup token is required');
    }

    // Convert to string if possible
    const token = String(value).trim();
    if (!token) {
      throw new BadRequestException('Setup token cannot be empty');
    }

    // Token should be a hexadecimal string of specific length
    if (!this.isValidTokenFormat(token)) {
      throw new BadRequestException(
        'Invalid token format. Token must be a hexadecimal string.',
      );
    }

    // Token length validation
    if (token.length !== SETUP_TOKEN_LENGTH) {
      throw new BadRequestException(
        `Invalid token length. Token must be ${SETUP_TOKEN_LENGTH} characters long.`,
      );
    }

    return token;
  }

  /**
   * Check if token matches required format
   * @param token Token to validate
   * @returns boolean indicating if token format is valid
   */
  private isValidTokenFormat(token: string): boolean {
    return /^[a-f0-9]+$/.test(token);
  }
}
