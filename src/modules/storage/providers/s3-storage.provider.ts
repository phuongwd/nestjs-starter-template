import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import {
  StorageProvider,
  StorageResult,
  DownloadResult,
  StorageItem,
} from '../interfaces/storage-provider.interface';
import {
  S3StorageConfig,
  S3UploadOptions,
  S3Metadata,
  mapStorageAclToS3Acl,
} from '../interfaces/s3-storage.interface';
import {
  StorageError,
  StorageFileNotFoundError,
  normalizeStorageError,
} from '../utils/storage-errors';

/**
 * AWS S3 implementation of StorageProvider
 */
@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly config: S3StorageConfig;

  constructor(config: S3StorageConfig) {
    this.config = config;
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
    });
  }

  /**
   * Upload a file to S3
   */
  public async upload(options: S3UploadOptions): Promise<StorageResult> {
    try {
      const key = this.getObjectKey(options.path);

      // Convert content to appropriate type for S3
      let body: Buffer | Readable;
      if (Buffer.isBuffer(options.content)) {
        body = options.content;
      } else if (options.content instanceof ReadableStream) {
        // Use Node's Readable stream
        const readable = new Readable();
        const reader = options.content.getReader();
        readable._read = () => {
          void (async () => {
            try {
              const { done, value } = await reader.read();
              if (done) {
                readable.push(null);
              } else {
                readable.push(value);
              }
            } catch (error) {
              readable.destroy(error as Error);
            }
          })();
        };
        body = readable;
      } else {
        body = options.content as Readable;
      }

      // Upload to S3
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          Body: body,
          ContentType: options.contentType,
          Metadata: options.metadata,
          ACL: mapStorageAclToS3Acl(options.acl),
          StorageClass: options.storageClass || this.config.defaultStorageClass,
          ServerSideEncryption:
            options.serverSideEncryption?.algorithm ||
            this.config.serverSideEncryption?.algorithm,
          SSEKMSKeyId:
            options.serverSideEncryption?.kmsKeyId ||
            this.config.serverSideEncryption?.kmsKeyId,
          CacheControl: options.cacheControl,
          ContentDisposition: options.contentDisposition,
        }),
      );

      // Get object metadata
      const metadata = await this.getMetadata(options.path);

      return {
        path: options.path,
        size: metadata.size,
        contentType: metadata.contentType,
        lastModified: metadata.lastModified,
        url: this.getPublicUrl(options.path),
        metadata,
      };
    } catch (error) {
      throw this.normalizeS3Error(error);
    }
  }

  /**
   * Download a file from S3
   */
  public async download(path: string): Promise<DownloadResult> {
    try {
      const key = this.getObjectKey(path);

      // Get object from S3
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );

      if (!result.Body) {
        throw new StorageError('Empty response from S3');
      }

      // Get metadata
      const metadata = await this.getMetadata(path);

      return {
        content: result.Body as Readable,
        contentType: metadata.contentType,
        size: metadata.size,
        metadata,
      };
    } catch (error) {
      throw this.normalizeS3Error(error);
    }
  }

  /**
   * Delete a file from S3
   */
  public async delete(path: string): Promise<void> {
    try {
      const key = this.getObjectKey(path);

      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      throw this.normalizeS3Error(error);
    }
  }

  /**
   * Check if a file exists in S3
   */
  public async exists(path: string): Promise<boolean> {
    try {
      const key = this.getObjectKey(path);

      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );

      return true;
    } catch (error) {
      if (
        error instanceof S3ServiceException &&
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw this.normalizeS3Error(error);
    }
  }

  /**
   * List files in S3 with optional prefix
   */
  public async list(prefix?: string): Promise<StorageItem[]> {
    try {
      const s3Prefix = prefix
        ? this.getObjectKey(prefix)
        : this.config.rootPath;

      const result = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: s3Prefix,
          Delimiter: '/',
        }),
      );

      const items: StorageItem[] = [];

      // Add directories (CommonPrefixes)
      if (result.CommonPrefixes) {
        for (const commonPrefix of result.CommonPrefixes) {
          if (commonPrefix.Prefix) {
            items.push({
              path: this.getStoragePath(commonPrefix.Prefix),
              isDirectory: true,
              size: 0,
              lastModified: new Date(),
            });
          }
        }
      }

      // Add files (Contents)
      if (result.Contents) {
        for (const content of result.Contents) {
          if (content.Key && !content.Key.endsWith('/')) {
            items.push({
              path: this.getStoragePath(content.Key),
              isDirectory: false,
              size: content.Size || 0,
              lastModified: content.LastModified || new Date(),
              contentType: await this.getContentType(content.Key),
            });
          }
        }
      }

      return items;
    } catch (error) {
      throw this.normalizeS3Error(error);
    }
  }

  /**
   * Get metadata for a file in S3
   */
  public async getMetadata(path: string): Promise<S3Metadata> {
    try {
      const key = this.getObjectKey(path);

      const result = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );

      if (!result) {
        throw new StorageFileNotFoundError(path);
      }

      return {
        contentType: result.ContentType || 'application/octet-stream',
        size: result.ContentLength || 0,
        lastModified: result.LastModified || new Date(),
        createdAt: result.LastModified || new Date(),
        etag: result.ETag || '',
        versionId: result.VersionId,
        storageClass: result.StorageClass || 'STANDARD',
        serverSideEncryption: result.ServerSideEncryption,
        acl: this.config.defaultAcl,
        custom: result.Metadata || {},
      };
    } catch (error) {
      throw this.normalizeS3Error(error);
    }
  }

  /**
   * Update metadata for a file in S3
   */
  public async updateMetadata(
    path: string,
    metadata: Partial<S3Metadata>,
  ): Promise<S3Metadata> {
    try {
      const key = this.getObjectKey(path);
      const sourceKey = `${this.config.bucket}/${key}`;

      // Copy object to itself with new metadata
      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          CopySource: sourceKey,
          Metadata: metadata.custom,
          ContentType: metadata.contentType,
          MetadataDirective: 'REPLACE',
          ACL: metadata.acl,
          StorageClass: metadata.storageClass,
          ServerSideEncryption: metadata.serverSideEncryption,
        }),
      );

      return this.getMetadata(path);
    } catch (error) {
      throw this.normalizeS3Error(error);
    }
  }

  /**
   * Generate a presigned URL for temporary access
   */
  public async generatePresignedUrl(
    path: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const key = this.getObjectKey(path);
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      return getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      throw this.normalizeS3Error(error);
    }
  }

  /**
   * Get the full S3 object key
   */
  private getObjectKey(path: string): string {
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    return this.config.rootPath
      ? `${this.config.rootPath}/${normalizedPath}`
      : normalizedPath;
  }

  /**
   * Get the storage path from an S3 key
   */
  private getStoragePath(key: string): string {
    if (this.config.rootPath && key.startsWith(this.config.rootPath)) {
      return key.substring(this.config.rootPath.length + 1);
    }
    return key;
  }

  /**
   * Get the public URL for an object
   */
  private getPublicUrl(path: string): string | undefined {
    if (!this.config.baseUrl) {
      return undefined;
    }

    const normalizedBaseUrl = this.config.baseUrl.endsWith('/')
      ? this.config.baseUrl
      : `${this.config.baseUrl}/`;

    return `${normalizedBaseUrl}${this.getObjectKey(path)}`;
  }

  /**
   * Get content type for an object
   */
  private async getContentType(key: string): Promise<string | undefined> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );
      return result.ContentType;
    } catch {
      return undefined;
    }
  }

  /**
   * Normalize S3 errors to storage errors
   */
  private normalizeS3Error(error: unknown): Error {
    if (error instanceof S3ServiceException) {
      if (error.$metadata?.httpStatusCode === 404) {
        return new StorageFileNotFoundError(error.message);
      }
      return new StorageError(`S3 Error: ${error.message}`);
    }
    return normalizeStorageError(error);
  }
}
