import { Logger } from '@nestjs/common';
import { ApplicationException } from '../../core/exceptions/application.exception';
import { ParsingException } from '../../core/exceptions/parsing.exception';
import { RepositoryException } from '../../core/exceptions/repository.exception';

/**
 * Utility class for consistent error handling across the application
 */
export class ErrorUtil {
  /**
   * General error handler
   * @param error The caught error
   * @param logger Logger instance
   * @param errorMessage Human-readable error message
   * @param fallbackValue Optional fallback value (if not provided, will throw)
   * @returns Fallback value or throws an exception
   */
  static handleError<T>(
    error: unknown,
    logger: Logger,
    errorMessage: string,
    fallbackValue?: T,
  ): never | T {
    // If it's already our custom exception, just throw it
    if (error instanceof ApplicationException) {
      throw error;
    }

    // Log the original error
    logger.error(
      `${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        originalError:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
              }
            : error,
      },
    );

    // If no fallback is provided, throw a new exception
    if (fallbackValue === undefined) {
      throw new ApplicationException(errorMessage, 'UNKNOWN_ERROR', {}, error);
    }

    // Return fallback value if provided
    return fallbackValue;
  }

  /**
   * Specialized handler for parsing errors
   * @param error The caught error
   * @param logger Logger instance
   * @param errorMessage Human-readable error message
   * @param fallbackValue Optional fallback value (if not provided, will throw)
   * @returns Fallback value or throws a ParsingException
   */
  static handleParsingError<T>(
    error: unknown,
    logger: Logger,
    errorMessage: string,
    fallbackValue?: T,
  ): never | T {
    // Log the original error
    logger.error(
      `${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        originalError:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
              }
            : error,
      },
    );

    // If no fallback is provided, throw a new exception
    if (fallbackValue === undefined) {
      throw new ParsingException(errorMessage, {}, error);
    }

    // Return fallback value if provided
    return fallbackValue;
  }

  /**
   * Specialized handler for repository errors
   * @param error The caught error
   * @param logger Logger instance
   * @param errorMessage Human-readable error message
   * @param fallbackValue Optional fallback value (if not provided, will throw)
   * @returns Fallback value or throws a RepositoryException
   */
  static handleRepositoryError<T>(
    error: unknown,
    logger: Logger,
    errorMessage: string,
    fallbackValue?: T,
  ): never | T {
    // Log the original error
    logger.error(
      `${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        originalError:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
              }
            : error,
      },
    );

    // If no fallback is provided, throw a new exception
    if (fallbackValue === undefined) {
      throw new RepositoryException(errorMessage, {}, error);
    }

    // Return fallback value if provided
    return fallbackValue;
  }
}
