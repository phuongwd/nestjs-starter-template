import { ApplicationException } from './application.exception';

/**
 * Exception for parsing errors
 * Used when there's an error parsing data (JSON, XML, YAML, etc.)
 */
export class ParsingException extends ApplicationException {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    cause?: Error | unknown,
  ) {
    super(message, 'PARSING_ERROR', details, cause);
  }
}
