import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrometheusService } from './prometheus.service';

/**
 * Middleware for tracking HTTP requests for Prometheus metrics
 */
@Injectable()
export class PrometheusMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PrometheusMiddleware.name);

  constructor(private readonly prometheusService: PrometheusService) {}

  /**
   * Process the request and track metrics
   * @param request Express request
   * @param response Express response
   * @param next Next function
   */
  use(request: Request, response: Response, next: NextFunction): void {
    // Skip metrics endpoint to avoid circular metrics
    if (request.path === '/metrics') {
      next();
      return;
    }

    const { method, path } = request;
    const startTime = Date.now();

    // Track request start
    this.prometheusService.startHttpRequest(method, path);

    // Add response event listener to track when the request completes
    response.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      const contentLength = parseInt(response.get('content-length') || '0', 10);
      const statusCode = response.statusCode;

      // Record request metrics
      this.prometheusService.recordHttpRequest(
        method,
        path,
        statusCode,
        duration,
        contentLength,
      );

      // End request tracking
      this.prometheusService.endHttpRequest(method, path);

      // Log request for debugging (optional)
      this.logger.debug(
        `${method} ${path} ${statusCode} ${duration.toFixed(3)}s ${contentLength}b`,
      );
    });

    next();
  }
}
