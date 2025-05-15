import { Injectable, Logger } from '@nestjs/common';
import {
  StorageProvider,
  UploadOptions,
  StorageResult,
  DownloadResult,
  StorageItem,
  StorageMetadata,
} from '../interfaces/storage-provider.interface';
import { GitHubStorageConfig } from '../interfaces/storage-config.interface';
import { GitHubApiClientService } from '../services/github-api-client.service';
import { StorageError, normalizeStorageError } from '../utils/storage-errors';

/**
 * GitHub repository implementation of StorageProvider
 * Provides file storage using GitHub repositories
 */
@Injectable()
export class GitHubStorageProvider implements StorageProvider {
  private readonly logger = new Logger(GitHubStorageProvider.name);
  private readonly config: GitHubStorageConfig;
  private readonly apiClient: GitHubApiClientService;
  private readonly pathPrefix: string;

  /**
   * Create a new GitHubStorageProvider
   * @param config Provider configuration
   */
  constructor(config: GitHubStorageConfig) {
    this.config = config;
    this.apiClient = new GitHubApiClientService(
      config.token,
      config.owner,
      config.repo,
      config.branch,
    );
    this.pathPrefix = config.basePath ? `${config.basePath}/` : '';

    this.logger.log(
      `GitHub storage provider initialized for ${config.owner}/${config.repo}`,
    );
  }

  /**
   * Upload a file to GitHub repository
   * @param options Upload options
   * @returns Promise with upload result
   */
  public async upload(options: UploadOptions): Promise<StorageResult> {
    try {
      const fullPath = this.getFullPath(options.path);
      const commitMessage = this.generateCommitMessage('Upload', options.path);

      let content: Buffer;
      if (Buffer.isBuffer(options.content)) {
        content = options.content;
      } else {
        // Convert stream to buffer
        content = await this.streamToBuffer(options.content);
      }

      // Check if file already exists
      let sha: string | undefined;
      try {
        const existingFile = await this.apiClient.getFileContent(fullPath);
        sha = existingFile.sha;
      } catch {
        // File doesn't exist, will create a new one
      }

      // Upload file to GitHub
      const result = await this.apiClient.createOrUpdateFile({
        path: fullPath,
        content,
        message: commitMessage,
        sha,
      });

      // Create metadata
      const metadata: StorageMetadata = {
        contentType: options.contentType || 'application/octet-stream',
        size: content.length,
        createdAt: new Date(),
        lastModified: new Date(),
        etag: result.sha,
        custom: options.metadata || {},
      };

      return {
        path: options.path,
        size: content.length,
        contentType: options.contentType || 'application/octet-stream',
        lastModified: new Date(),
        url: this.getPublicUrl(options.path),
        metadata,
      };
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Download a file from GitHub repository
   * @param path File path
   * @returns Promise with download result
   */
  public async download(path: string): Promise<DownloadResult> {
    try {
      const fullPath = this.getFullPath(path);

      // Get file content stream
      const content = await this.apiClient.getFileStream(fullPath);

      // Get file metadata
      const fileContent = await this.apiClient.getFileContent(fullPath);

      const metadata: StorageMetadata = {
        contentType: fileContent.contentType || 'application/octet-stream',
        size: fileContent.size,
        createdAt: fileContent.lastModified || new Date(),
        lastModified: fileContent.lastModified || new Date(),
        etag: fileContent.sha,
        custom: {},
      };

      return {
        content,
        contentType: fileContent.contentType || 'application/octet-stream',
        size: fileContent.size,
        metadata,
      };
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Delete a file from GitHub repository
   * @param path Path to the file
   * @returns Promise resolving when deletion is complete
   */
  public async delete(path: string): Promise<void> {
    try {
      const fullPath = this.getFullPath(path);
      const commitMessage = this.generateCommitMessage('Delete', path);

      // Get file SHA (required for deletion)
      const file = await this.apiClient.getFileContent(fullPath);

      // Delete file
      await this.apiClient.deleteFile(fullPath, commitMessage, file.sha);
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Check if a file exists in GitHub repository
   * @param path Path to the file
   * @returns Promise resolving to boolean indicating existence
   */
  public async exists(path: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(path);
      return await this.apiClient.fileExists(fullPath);
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * List files in GitHub repository with optional prefix
   * @param prefix Optional path prefix to filter results
   * @returns Promise with array of storage items
   */
  public async list(prefix = ''): Promise<StorageItem[]> {
    try {
      const fullPrefix = this.getFullPath(prefix);
      const contents = await this.apiClient.listFiles(fullPrefix);

      return contents.map((item) => ({
        path: this.getRelativePath(item.path),
        isDirectory: item.type === 'dir',
        size: item.size,
        lastModified: item.lastModified || new Date(),
        contentType:
          item.type === 'file'
            ? item.contentType || 'application/octet-stream'
            : undefined,
      }));
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Get metadata for a file in GitHub repository
   * @param path Path to the file
   * @returns Promise with file metadata
   */
  public async getMetadata(path: string): Promise<StorageMetadata> {
    try {
      const fullPath = this.getFullPath(path);
      const file = await this.apiClient.getFileContent(fullPath);

      return {
        contentType: file.contentType || 'application/octet-stream',
        size: file.size,
        createdAt: file.lastModified || new Date(),
        lastModified: file.lastModified || new Date(),
        etag: file.sha,
        custom: {},
      };
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Update metadata for a file in GitHub repository
   * @param path Path to the file
   * @param metadata Partial metadata to update
   * @returns Promise with updated metadata
   */
  public async updateMetadata(
    path: string,
    metadata: Partial<StorageMetadata>,
  ): Promise<StorageMetadata> {
    try {
      // GitHub doesn't support updating just metadata
      // We need to download, then reupload with the same content but updated metadata
      const fullPath = this.getFullPath(path);
      const file = await this.apiClient.getFileContent(fullPath);

      // Download the actual content
      const downloadResponse = await this.download(path);
      const content = await this.streamToBuffer(downloadResponse.content);

      const commitMessage = this.generateCommitMessage(
        'Update metadata for',
        path,
      );

      // Update file with same content but potentially updated metadata
      const result = await this.apiClient.createOrUpdateFile({
        path: fullPath,
        content,
        message: commitMessage,
        sha: file.sha,
      });

      // Create updated metadata object
      const updatedMetadata: StorageMetadata = {
        ...downloadResponse.metadata,
        ...metadata,
        lastModified: new Date(),
        etag: result.sha,
      };

      return updatedMetadata;
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Get full path including prefix
   * @param storagePath Storage path
   * @returns Full path with prefix
   */
  private getFullPath(storagePath: string): string {
    // Remove leading slashes and combine with path prefix
    const normalizedPath = storagePath.replace(/^\/+/, '');
    return normalizedPath
      ? `${this.pathPrefix}${normalizedPath}`
      : this.pathPrefix.slice(0, -1); // Remove trailing slash if no path
  }

  /**
   * Get relative path by removing the path prefix
   * @param fullPath Full path
   * @returns Relative path
   */
  private getRelativePath(fullPath: string): string {
    if (!this.pathPrefix) {
      return fullPath;
    }
    return fullPath.startsWith(this.pathPrefix)
      ? fullPath.substring(this.pathPrefix.length)
      : fullPath;
  }

  /**
   * Get public URL for a file
   * @param storagePath Storage path
   * @returns Public URL
   */
  private getPublicUrl(storagePath: string): string {
    const fullPath = this.getFullPath(storagePath);

    if (this.config.customDomain) {
      return `${this.config.customDomain}/${fullPath}`;
    }

    if (this.config.useRawUrl !== false) {
      // Use raw.githubusercontent.com for direct file access
      const branch = this.config.branch || 'main';
      return `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/${branch}/${fullPath}`;
    }

    // Use GitHub HTML URL (will render files rather than serve raw content)
    return `https://github.com/${this.config.owner}/${this.config.repo}/blob/${this.config.branch || 'main'}/${fullPath}`;
  }

  /**
   * Generate a commit message for GitHub operations
   * @param operation Operation type (Upload, Delete, etc.)
   * @param path File path
   * @returns Formatted commit message
   */
  private generateCommitMessage(operation: string, path: string): string {
    return `${operation} ${path} via LMS Storage Provider`;
  }

  /**
   * Convert a readable stream to a buffer
   * @param stream Readable stream
   * @returns Promise resolving to buffer
   */
  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];

      stream.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      stream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      stream.on('error', (err) => {
        reject(new StorageError(`Error reading stream: ${err.message}`));
      });
    });
  }
}
