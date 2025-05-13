/**
 * Base Repository Implementation
 *
 * This abstract class provides the foundation for all repositories in the application,
 * implementing the Repository Pattern with proper error handling, tenant awareness,
 * and query optimization.
 *
 * Current Implementation:
 * ✅ Base Repository functionality
 * ✅ Interface segregation
 * ✅ Dependency injection
 * ✅ Error handling and mapping
 * ✅ Tenant awareness
 * ✅ Query optimization and slow query detection
 * ✅ Query Builder support
 *
 * TODO Implementation Checklist:
 * 1. Performance Optimization
 *    [ ] Add caching decorator for read operations
 *      Example:
 *      ```typescript
 *      @Cache('entity', 300)
 *      async findById(id: number) {
 *        // Implementation
 *      }
 *      ```
 *    [ ] Add retry mechanism for write operations
 *      Example:
 *      ```typescript
 *      @Retry({ attempts: 3, delay: 1000 })
 *      async create(data: CreateDto) {
 *        // Implementation
 *      }
 *      ```
 *
 * 2. Transaction Support
 *    [ ] Add transaction wrapper method
 *      Example:
 *      ```typescript
 *      async executeInTransaction<T>(
 *        operations: (tx: Prisma.TransactionClient) => Promise<T>
 *      ): Promise<T> {
 *        return this.prisma.$transaction(operations);
 *      }
 *      ```
 *
 * 3. Validation Layer
 *    [ ] Add data validation using Zod or class-validator
 *      Example:
 *      ```typescript
 *      protected validateData<T>(data: T, schema: ZodSchema): void {
 *        const result = schema.safeParse(data);
 *        if (!result.success) {
 *          throw new BadRequestException(result.error);
 *        }
 *      }
 *      ```
 *
 * 4. Query Optimization
 *    [ ] Implement query result caching
 *    [ ] Add index usage tracking
 *    [ ] Implement query plan analysis
 *
 * 5. Monitoring and Metrics
 *    [ ] Add query timing metrics
 *    [ ] Track cache hit/miss rates
 *    [ ] Monitor connection pool usage
 *
 * 6. Security Enhancements
 *    [ ] Add query sanitization
 *    [ ] Implement rate limiting
 *    [ ] Add audit logging for write operations
 *
 * Usage Guidelines:
 * 1. Always extend this base repository for new repositories
 * 2. Implement proper error handling using provided methods
 * 3. Use QueryBuilder for complex queries
 * 4. Add proper logging for important operations
 * 5. Consider performance implications for each operation
 * 6. Maintain tenant awareness where required
 *
 * @template _TEntity The entity type this repository manages
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../context/tenant.context';
import { Prisma } from '@prisma/client';

@Injectable()
export abstract class BaseRepository<_TEntity> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly entityName: string = 'entity',
  ) {}

  /**
   * Applies tenant context to a where clause if applicable
   *
   * In this application, "tenant" refers to "organization" - applying tenant context
   * means adding the current organization ID to queries for proper multi-tenant isolation.
   *
   * @param data - The existing data object
   * @returns The data object with organization ID as tenant context
   */
  protected applyTenantContext<TData extends Record<string, unknown>>(
    data: TData,
  ): TData & { organizationId?: number } {
    if (!this.isTenantAware()) {
      return data;
    }

    const tenantId = TenantContext.getCurrentTenantId();
    return {
      ...data,
      organizationId: tenantId,
    };
  }

  /**
   * Override this method in repository implementations to specify
   * whether the model is tenant-aware (organization-scoped)
   *
   * @returns true if the entity should be filtered by organization ID, false otherwise
   */
  protected abstract isTenantAware(): boolean;

  /**
   * Wraps a database operation with tenant context and error handling
   *
   * Ensures that database operations maintain organization isolation by
   * preserving the tenant (organization) context throughout the operation.
   *
   * @param operation - The database operation to execute
   * @returns The result of the operation
   */
  protected async withTenantContext<TResult>(
    operation: () => Promise<TResult>,
  ): Promise<TResult> {
    const tenantId = TenantContext.getCurrentTenantId();
    return tenantId
      ? TenantContext.runWithTenant(tenantId, () =>
          this.handleDatabaseOperation(operation),
        )
      : this.handleDatabaseOperation(operation);
  }

  /**
   * Handles database operations with proper error handling and logging
   */
  protected async handleDatabaseOperation<TResult>(
    operation: () => Promise<TResult>,
  ): Promise<TResult> {
    try {
      return await operation();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Database operation failed for ${this.entityName}: ${errorMessage}`,
        errorStack,
      );

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw this.mapPrismaError(error);
      }

      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new ConflictException('Invalid data provided');
      }

      if (error instanceof Prisma.PrismaClientInitializationError) {
        throw new InternalServerErrorException('Database connection error');
      }

      throw new InternalServerErrorException(
        'An unexpected error occurred during database operation',
      );
    }
  }

  /**
   * Maps Prisma errors to NestJS exceptions
   */
  protected mapPrismaError(error: Prisma.PrismaClientKnownRequestError): Error {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return new ConflictException(
          `${this.entityName} with these details already exists`,
        );
      case 'P2025': // Record not found
        return new NotFoundException(`${this.entityName} not found`);
      case 'P2003': // Foreign key constraint violation
        return new ConflictException(
          `Related ${this.entityName} record does not exist`,
        );
      case 'P2014': // Invalid ID
        return new ConflictException(`Invalid ${this.entityName} ID`);
      case 'P2021': // Table does not exist
        return new InternalServerErrorException('Database schema error');
      case 'P2024': // Connection timeout
        return new InternalServerErrorException('Database timeout');
      default:
        return new InternalServerErrorException(
          `Database error: ${error.message}`,
        );
    }
  }

  /**
   * Executes a query with optimizations
   */
  protected async executeQuery<TResult>(
    query: () => Promise<TResult>,
    errorMessage: string,
  ): Promise<TResult> {
    return this.withTenantContext(async () => {
      try {
        const startTime = Date.now();
        const result = await query();
        const duration = Date.now() - startTime;

        if (duration > 1000) {
          // Log slow queries
          this.logger.warn(
            `Slow query detected in ${this.entityName} repository: ${duration}ms`,
          );
        }

        return result;
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));

        this.logger.error(`${errorMessage}: ${err.message}`, err.stack);

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          throw this.mapPrismaError(error);
        }

        if (error instanceof Prisma.PrismaClientValidationError) {
          throw new ConflictException('Invalid data provided');
        }

        if (error instanceof Prisma.PrismaClientInitializationError) {
          throw new InternalServerErrorException('Database connection error');
        }

        throw new InternalServerErrorException(
          'An unexpected error occurred during query execution',
        );
      }
    });
  }
}
