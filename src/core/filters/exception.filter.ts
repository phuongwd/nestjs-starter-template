import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApplicationException } from '../exceptions/application.exception';

/**
 * Global exception filter for ApplicationException
 * Captures all ApplicationException instances and transforms them into
 * appropriate HTTP responses
 */
@Catch(ApplicationException)
export class ApplicationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApplicationExceptionFilter.name);

  catch(exception: ApplicationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Log the error with details
    this.logger.error(`${exception.message}`, {
      code: exception.code,
      details: exception.details,
      stack: exception.stack,
      cause:
        exception.cause instanceof Error
          ? {
              message: (exception.cause as Error).message,
              stack: (exception.cause as Error).stack,
            }
          : exception.cause,
    });

    // Return appropriate response
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: exception.message,
      code: exception.code,
      timestamp: new Date().toISOString(),
    });
  }
}
