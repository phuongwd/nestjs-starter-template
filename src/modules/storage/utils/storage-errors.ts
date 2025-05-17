/**
 * Base class for all storage-related errors
 */
export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Error thrown when a file is not found in storage
 */
export class StorageFileNotFoundError extends StorageError {
  constructor(path: string) {
    super(`File not found at path: ${path}`);
    this.name = 'StorageFileNotFoundError';
  }
}

/**
 * Error thrown when a file already exists and cannot be overwritten
 */
export class StorageFileExistsError extends StorageError {
  constructor(path: string) {
    super(`File already exists at path: ${path}`);
    this.name = 'StorageFileExistsError';
  }
}

/**
 * Error thrown when a storage operation fails due to permission issues
 */
export class StoragePermissionError extends StorageError {
  constructor(message: string) {
    super(message);
    this.name = 'StoragePermissionError';
  }
}

/**
 * Error thrown when a storage quota is exceeded
 */
export class StorageQuotaExceededError extends StorageError {
  constructor(
    organizationId: string,
    quotaBytes: number,
    requestedBytes: number,
  ) {
    super(
      `Storage quota exceeded for organization ${organizationId}. Quota: ${quotaBytes} bytes, Requested: ${requestedBytes} bytes`,
    );
    this.name = 'StorageQuotaExceededError';
  }
}

/**
 * Error thrown when an invalid file type is uploaded
 */
export class StorageInvalidFileTypeError extends StorageError {
  constructor(contentType: string, allowedTypes: string[]) {
    super(
      `Invalid file type: ${contentType}. Allowed types: ${allowedTypes.join(', ')}`,
    );
    this.name = 'StorageInvalidFileTypeError';
  }
}

/**
 * Error thrown when a file exceeds the maximum allowed size
 */
export class StorageFileSizeExceededError extends StorageError {
  constructor(size: number, maxSize: number) {
    super(
      `File size exceeded. Size: ${size} bytes, Max allowed: ${maxSize} bytes`,
    );
    this.name = 'StorageFileSizeExceededError';
  }
}

/**
 * Error thrown when a storage provider configuration is invalid
 */
export class StorageConfigurationError extends StorageError {
  constructor(message: string) {
    super(message);
    this.name = 'StorageConfigurationError';
  }
}

/**
 * Error thrown when a storage operation times out
 */
export class StorageTimeoutError extends StorageError {
  constructor(operation: string, timeoutMs: number) {
    super(`Storage operation '${operation}' timed out after ${timeoutMs}ms`);
    this.name = 'StorageTimeoutError';
  }
}

/**
 * Helper function to standardize error handling across providers
 * @param error Original error from provider
 * @returns Standardized StorageError
 */
export function normalizeStorageError(error: unknown): StorageError {
  // If it's already a StorageError, return it
  if (error instanceof StorageError) {
    return error;
  }

  // Convert Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Check for common error patterns
    if (message.includes('not found') || message.includes('no such file')) {
      return new StorageFileNotFoundError(extractPathFromError(error.message));
    }

    if (message.includes('already exists')) {
      return new StorageFileExistsError(extractPathFromError(error.message));
    }

    if (
      message.includes('permission') ||
      message.includes('access denied') ||
      message.includes('forbidden')
    ) {
      return new StoragePermissionError(error.message);
    }

    if (message.includes('quota') || message.includes('limit exceeded')) {
      return new StorageQuotaExceededError('unknown', 0, 0);
    }

    // Generic fallback
    return new StorageError(`Storage operation failed: ${error.message}`);
  }

  // Handle unknown error types
  return new StorageError(`Unknown storage error: ${String(error)}`);
}

/**
 * Helper function to extract file path from error messages
 * @param message Error message
 * @returns Extracted path or 'unknown'
 */
function extractPathFromError(message: string): string {
  // Try to extract path from common error message patterns
  const pathMatch =
    message.match(/path[:\s]+['"]?([^'"]+)['"]?/i) ||
    message.match(/file[:\s]+['"]?([^'"]+)['"]?/i);

  return pathMatch ? pathMatch[1] : 'unknown';
}
