import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestWithUser } from '@/shared/types/request.types';

@Injectable()
export class LoggingInterceptor implements NestInterceptor<unknown, unknown> {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { method, url, user } = request;
    const userId = user?.id;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `${method} ${url} ${userId ? `[User: ${userId}]` : ''} ${
              Date.now() - startTime
            }ms`,
          );
        },
        error: (err: Error) => {
          this.logger.error(
            `${method} ${url} ${userId ? `[User: ${userId}]` : ''} ${
              Date.now() - startTime
            }ms - Error: ${err.message}`,
          );
        },
      }),
    );
  }
}
