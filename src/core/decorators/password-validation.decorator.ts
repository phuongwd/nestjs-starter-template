import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

const PASSWORD_DESCRIPTION = `Password requirements:
    - Minimum 8 characters
    - Must contain at least one uppercase letter
    - Must contain at least one lowercase letter
    - Must contain at least one number
    - Must contain at least one special character (@$!%*?&)`;

const PASSWORD_EXAMPLE = 'Admin@123456';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const PASSWORD_ERROR_MESSAGE =
  'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character (@$!%*?&)';

/**
 * Decorator for password validation
 * @param isOptional - Whether the password field is optional (for update operations)
 * @returns Decorator array with validation rules
 */
export function IsValidPassword(isOptional = false) {
  return applyDecorators(
    isOptional
      ? ApiPropertyOptional({
          example: PASSWORD_EXAMPLE,
          description: PASSWORD_DESCRIPTION,
          minLength: 8,
        })
      : ApiProperty({
          example: PASSWORD_EXAMPLE,
          description: PASSWORD_DESCRIPTION,
          minLength: 8,
        }),
    IsString(),
    MinLength(8),
    Matches(PASSWORD_REGEX, {
      message: PASSWORD_ERROR_MESSAGE,
    }),
  );
}
