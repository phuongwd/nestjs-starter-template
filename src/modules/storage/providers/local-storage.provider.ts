import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, stat, readdir, unlink, access } from 'fs/promises';
import { Readable } from 'stream';
import {
  StorageProvider,
  UploadOptions,
  StorageResult,
  DownloadResult,
  StorageItem,
  StorageMetadata,
} from '../interfaces/storage-provider.interface';
import { LocalStorageConfig } from '../interfaces/storage-config.interface';
import {
  StorageError,
  StorageFileNotFoundError,
  normalizeStorageError,
} from '../utils/storage-errors';

/**
 * Local file system implementation of StorageProvider
 * Used primarily for development environments
 */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly config: LocalStorageConfig;
  private readonly baseDirectory: string;

  /**
   * Create a new LocalStorageProvider
   * @param config Provider configuration
   */
  constructor(config: LocalStorageConfig) {
    this.config = config;
    this.baseDirectory = path.resolve(config.directory);
    void this.ensureBaseDirectoryExists();
  }

  /**
   * Upload a file to local storage
   * @param options Upload options
   * @returns Promise with upload result
   */
  public async upload(options: UploadOptions): Promise<StorageResult> {
    try {
      const filePath = this.getFullPath(options.path);
      const dirPath = path.dirname(filePath);

      // Ensure directory exists
      await mkdir(dirPath, { recursive: true });

      // Write file
      await this.writeFile(options.content, filePath);

      // Get file stats
      const stats = await stat(filePath);

      // Create metadata
      const metadata: StorageMetadata = {
        contentType: options.contentType || 'application/octet-stream',
        size: stats.size,
        createdAt: stats.birthtime,
        lastModified: stats.mtime,
        custom: options.metadata || {},
      };

      // Write metadata file
      await this.writeMetadataFile(options.path, metadata);

      return {
        path: options.path,
        size: stats.size,
        contentType: options.contentType || 'application/octet-stream',
        lastModified: stats.mtime,
        url: this.getPublicUrl(options.path),
        metadata,
      };
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Download a file from local storage
   * @param path File path
   * @returns Promise with download result
   */
  public async download(path: string): Promise<DownloadResult> {
    try {
      const filePath = this.getFullPath(path);

      // Check if file exists
      await this.ensureFileExists(filePath);

      // Get file stats
      const stats = await stat(filePath);

      // Get metadata
      const metadata = await this.getMetadata(path);

      // Create readable stream
      const content = createReadStream(filePath);

      return {
        content,
        contentType: metadata.contentType,
        size: stats.size,
        metadata,
      };
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Delete a file from local storage
   * @param path File path
   * @returns Promise resolving when deletion is complete
   */
  public async delete(path: string): Promise<void> {
    try {
      const filePath = this.getFullPath(path);
      const metadataPath = this.getMetadataPath(path);

      // Check if file exists
      await this.ensureFileExists(filePath);

      // Delete file
      await unlink(filePath);

      // Try to delete metadata file if it exists
      try {
        await unlink(metadataPath);
      } catch {
        // Ignore errors if metadata file doesn't exist
      }
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Check if a file exists in local storage
   * @param path File path
   * @returns Promise resolving to boolean indicating existence
   */
  public async exists(path: string): Promise<boolean> {
    try {
      const filePath = this.getFullPath(path);
      await access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List files in local storage with optional prefix
   * @param prefix Optional path prefix to filter results
   * @returns Promise with array of storage items
   */
  public async list(prefix?: string): Promise<StorageItem[]> {
    try {
      const basePath = prefix ? this.getFullPath(prefix) : this.baseDirectory;

      // Check if directory exists
      try {
        await access(basePath, fs.constants.F_OK);
      } catch {
        return [];
      }

      // Get directory stats to check if it's a directory
      const baseStats = await stat(basePath);
      if (!baseStats.isDirectory()) {
        // If it's a file, return it as a single item
        const relativePath = this.getRelativePath(basePath);
        return [
          {
            path: relativePath,
            isDirectory: false,
            size: baseStats.size,
            lastModified: baseStats.mtime,
            contentType: (await this.tryGetMetadata(relativePath))?.contentType,
          },
        ];
      }

      // List directory contents
      const entries = await readdir(basePath, { withFileTypes: true });
      const items: StorageItem[] = [];

      for (const entry of entries) {
        // Skip metadata files
        if (entry.name.endsWith('.metadata.json')) {
          continue;
        }

        const fullPath = path.join(basePath, entry.name);
        const relativePath = this.getRelativePath(fullPath);
        const entryStats = await stat(fullPath);

        items.push({
          path: relativePath,
          isDirectory: entry.isDirectory(),
          size: entryStats.size,
          lastModified: entryStats.mtime,
          contentType: entry.isDirectory()
            ? undefined
            : (await this.tryGetMetadata(relativePath))?.contentType,
        });
      }

      return items;
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Get metadata for a file
   * @param path File path
   * @returns Promise with file metadata
   */
  public async getMetadata(path: string): Promise<StorageMetadata> {
    try {
      const filePath = this.getFullPath(path);
      const metadataPath = this.getMetadataPath(path);

      // Check if file exists
      await this.ensureFileExists(filePath);

      // Get file stats
      const stats = await stat(filePath);

      // Try to read metadata file
      try {
        const metadataContent = await fs.promises.readFile(
          metadataPath,
          'utf8',
        );
        const metadata = JSON.parse(metadataContent);

        // Update size and dates from actual file stats
        return {
          ...metadata,
          size: stats.size,
          lastModified: stats.mtime,
        };
      } catch {
        // If metadata file doesn't exist or is invalid, create default metadata
        return {
          contentType: 'application/octet-stream',
          size: stats.size,
          createdAt: stats.birthtime,
          lastModified: stats.mtime,
          custom: {},
        };
      }
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Update metadata for a file
   * @param path File path
   * @param metadata Partial metadata to update
   * @returns Promise with updated metadata
   */
  public async updateMetadata(
    path: string,
    metadata: Partial<StorageMetadata>,
  ): Promise<StorageMetadata> {
    try {
      const filePath = this.getFullPath(path);

      // Check if file exists
      await this.ensureFileExists(filePath);

      // Get current metadata
      const currentMetadata = await this.getMetadata(path);

      // Merge with new metadata
      const updatedMetadata: StorageMetadata = {
        ...currentMetadata,
        ...metadata,
        custom: {
          ...currentMetadata.custom,
          ...(metadata.custom || {}),
        },
      };

      // Write updated metadata
      await this.writeMetadataFile(path, updatedMetadata);

      return updatedMetadata;
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Ensure the base directory exists
   * @private
   */
  private async ensureBaseDirectoryExists(): Promise<void> {
    try {
      await mkdir(this.baseDirectory, { recursive: true });
    } catch (error) {
      throw new StorageError(
        `Failed to create base directory: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get the full file system path for a storage path
   * @param storagePath Storage path
   * @returns Full file system path
   * @private
   */
  private getFullPath(storagePath: string): string {
    // Resolve the absolute path and normalize it
    const resolvedPath = path.resolve(this.baseDirectory, storagePath);

    // Ensure the resolved path is within the base directory
    if (!resolvedPath.startsWith(path.resolve(this.baseDirectory))) {
      throw new Error(
        'Invalid storage path: Potential path traversal detected.',
      );
    }

    return resolvedPath;
  }

  /**
   * Get the path for storing metadata
   * @param storagePath Storage path
   * @returns Metadata file path
   * @private
   */
  private getMetadataPath(storagePath: string): string {
    return `${this.getFullPath(storagePath)}.metadata.json`;
  }

  /**
   * Get the relative path from a full file system path
   * @param fullPath Full file system path
   * @returns Relative storage path
   * @private
   */
  private getRelativePath(fullPath: string): string {
    return path.relative(this.baseDirectory, fullPath).replace(/\\/g, '/');
  }

  /**
   * Get the public URL for a file
   * @param storagePath Storage path
   * @returns Public URL or undefined if not configured
   * @private
   */
  private getPublicUrl(storagePath: string): string | undefined {
    if (!this.config.baseUrl) {
      return undefined;
    }

    const normalizedBaseUrl = this.config.baseUrl.endsWith('/')
      ? this.config.baseUrl
      : `${this.config.baseUrl}/`;

    return `${normalizedBaseUrl}${storagePath}`;
  }

  /**
   * Write file content to disk
   * @param content File content
   * @param filePath Target file path
   * @private
   */
  private async writeFile(
    content: Buffer | NodeJS.ReadableStream,
    filePath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(filePath);

      writeStream.on('error', (error) => {
        reject(error);
      });

      writeStream.on('finish', () => {
        resolve();
      });

      if (Buffer.isBuffer(content)) {
        writeStream.write(content);
        writeStream.end();
      } else {
        const readStream = content as Readable;
        readStream.pipe(writeStream);

        readStream.on('error', (error) => {
          writeStream.end();
          reject(error);
        });
      }
    });
  }

  /**
   * Write metadata to a file
   * @param storagePath Storage path
   * @param metadata Metadata to write
   * @private
   */
  private async writeMetadataFile(
    storagePath: string,
    metadata: StorageMetadata,
  ): Promise<void> {
    const metadataPath = this.getMetadataPath(storagePath);
    await fs.promises.writeFile(
      metadataPath,
      JSON.stringify(metadata, null, 2),
      'utf8',
    );
  }

  /**
   * Ensure a file exists
   * @param filePath File path
   * @throws StorageFileNotFoundError if file doesn't exist
   * @private
   */
  private async ensureFileExists(filePath: string): Promise<void> {
    try {
      await access(filePath, fs.constants.F_OK);
    } catch {
      throw new StorageFileNotFoundError(this.getRelativePath(filePath));
    }
  }

  /**
   * Try to get metadata without throwing if file doesn't exist
   * @param path Storage path
   * @returns Metadata or undefined if not found
   * @private
   */
  private async tryGetMetadata(
    path: string,
  ): Promise<StorageMetadata | undefined> {
    try {
      return await this.getMetadata(path);
    } catch {
      return undefined;
    }
  }
}
