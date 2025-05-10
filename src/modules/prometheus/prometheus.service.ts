import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

/**
 * Service for Prometheus metrics
 * @description Manages Prometheus metrics collection and exposure
 */
@Injectable()
export class PrometheusService implements OnModuleInit {
  private readonly logger = new Logger(PrometheusService.name);
  private readonly registry: client.Registry;

  // HTTP metrics
  private httpRequestsTotal!: client.Counter<string>;
  private httpRequestDuration!: client.Histogram<string>;
  private httpRequestsInProgress!: client.Gauge<string>;
  private httpResponseSize!: client.Histogram<string>;

  // Database metrics
  private dbQueryDuration!: client.Histogram<string>;
  private dbQueriesTotal!: client.Counter<string>;
  private dbConnectionsActive!: client.Gauge<string>;

  // Application metrics
  private appMemoryUsage!: client.Gauge<string>;
  private appCpuUsage!: client.Gauge<string>;
  private appUptime!: client.Gauge<string>;

  constructor() {
    // Create a Registry to register the metrics
    this.registry = new client.Registry();

    // Add default metrics (CPU, memory, event loop, etc.)
    client.collectDefaultMetrics({ register: this.registry });

    // Initialize custom metrics
    this.initializeMetrics();
  }

  onModuleInit(): void {
    this.logger.log('Prometheus metrics initialized');

    // Start collecting application metrics
    this.startCollectingAppMetrics();
  }

  /**
   * Initialize custom metrics
   */
  private initializeMetrics(): void {
    // HTTP metrics
    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestsInProgress = new client.Gauge({
      name: 'http_requests_in_progress',
      help: 'Number of HTTP requests in progress',
      labelNames: ['method', 'route'],
      registers: [this.registry],
    });

    this.httpResponseSize = new client.Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry],
    });

    // Database metrics
    this.dbQueryDuration = new client.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'entity'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.dbQueriesTotal = new client.Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'entity', 'status'],
      registers: [this.registry],
    });

    this.dbConnectionsActive = new client.Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      registers: [this.registry],
    });

    // Application metrics
    this.appMemoryUsage = new client.Gauge({
      name: 'app_memory_usage_bytes',
      help: 'Memory usage of the application in bytes',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.appCpuUsage = new client.Gauge({
      name: 'app_cpu_usage_percent',
      help: 'CPU usage of the application in percent',
      registers: [this.registry],
    });

    this.appUptime = new client.Gauge({
      name: 'app_uptime_seconds',
      help: 'Uptime of the application in seconds',
      registers: [this.registry],
    });
  }

  /**
   * Start collecting application metrics
   */
  private startCollectingAppMetrics(): void {
    // Collect metrics every 15 seconds
    setInterval(() => {
      const memoryUsage = process.memoryUsage();

      // Update memory metrics
      this.appMemoryUsage.set({ type: 'rss' }, memoryUsage.rss);
      this.appMemoryUsage.set({ type: 'heapTotal' }, memoryUsage.heapTotal);
      this.appMemoryUsage.set({ type: 'heapUsed' }, memoryUsage.heapUsed);
      this.appMemoryUsage.set({ type: 'external' }, memoryUsage.external);

      // Update uptime
      this.appUptime.set(process.uptime());

      // CPU usage is more complex and would require additional libraries
      // This is a simplified version
      this.appCpuUsage.set(process.cpuUsage().user / 1000000);
    }, 15000);
  }

  /**
   * Record HTTP request metrics
   * @param method HTTP method
   * @param route Route path
   * @param statusCode HTTP status code
   * @param duration Request duration in seconds
   * @param contentLength Response size in bytes
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    contentLength?: number,
  ): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration,
    );

    if (contentLength) {
      this.httpResponseSize.observe(
        { method, route, status_code: statusCode },
        contentLength,
      );
    }
  }

  /**
   * Track HTTP request start
   * @param method HTTP method
   * @param route Route path
   */
  startHttpRequest(method: string, route: string): void {
    this.httpRequestsInProgress.inc({ method, route });
  }

  /**
   * Track HTTP request end
   * @param method HTTP method
   * @param route Route path
   */
  endHttpRequest(method: string, route: string): void {
    this.httpRequestsInProgress.dec({ method, route });
  }

  /**
   * Record database query metrics
   * @param operation Query operation (e.g., 'find', 'create', 'update')
   * @param entity Entity name
   * @param duration Query duration in seconds
   * @param success Whether the query was successful
   */
  recordDbQuery(
    operation: string,
    entity: string,
    duration: number,
    success: boolean,
  ): void {
    this.dbQueryDuration.observe({ operation, entity }, duration);
    this.dbQueriesTotal.inc({
      operation,
      entity,
      status: success ? 'success' : 'error',
    });
  }

  /**
   * Set active database connections
   * @param count Number of active connections
   */
  setDbConnectionsActive(count: number): void {
    this.dbConnectionsActive.set(count);
  }

  /**
   * Get all metrics
   * @returns Prometheus metrics in string format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
