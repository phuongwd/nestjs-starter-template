import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Interceptor to audit setup operations
 * @description Logs setup-related activities for security and debugging
 */
@Injectable()
export class SetupAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SetupAuditInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;

    // Log the start of the request
    this.logger.log(
      `Setup operation started - Method: ${method}, URL: ${url}, IP: ${ip}`,
    );

    const now = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          // Log successful completion
          this.logger.log(
            `Setup operation completed - Method: ${method}, URL: ${url}, IP: ${ip}, Duration: ${
              Date.now() - now
            }ms`,
          );
        },
        error: (error) => {
          // Log errors
          this.logger.error(
            `Setup operation failed - Method: ${method}, URL: ${url}, IP: ${ip}, Error: ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }
}
