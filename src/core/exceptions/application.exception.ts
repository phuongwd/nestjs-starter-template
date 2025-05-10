/**
 * Base exception class for application errors
 * Extends built-in Error with additional properties for
 * error codes, details, and the original error that caused this exception
 */
export class ApplicationException extends Error {
  constructor(
    public readonly message: string,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
    public readonly cause?: Error | unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
