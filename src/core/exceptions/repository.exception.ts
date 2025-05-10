import { ApplicationException } from './application.exception';

/**
 * Exception for repository errors
 * Used when there's an error interacting with data storage
 */
export class RepositoryException extends ApplicationException {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    cause?: Error | unknown,
  ) {
    super(message, 'REPOSITORY_ERROR', details, cause);
  }
}
