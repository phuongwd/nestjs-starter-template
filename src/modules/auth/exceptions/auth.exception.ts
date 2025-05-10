import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AUTH_ERROR_MESSAGES } from '../constants/auth.constant';

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
  }
}

export class EmailExistsException extends ConflictException {
  constructor() {
    super(AUTH_ERROR_MESSAGES.EMAIL_EXISTS);
  }
}

export class TokenExpiredException extends UnauthorizedException {
  constructor() {
    super(AUTH_ERROR_MESSAGES.TOKEN_EXPIRED);
  }
}

export class InvalidTokenException extends UnauthorizedException {
  constructor() {
    super(AUTH_ERROR_MESSAGES.INVALID_TOKEN);
  }
}
