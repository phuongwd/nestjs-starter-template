import { Injectable } from '@nestjs/common';
import { S3 } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';
import {
  StorageProvider,
  UploadOptions,
  StorageResult,
  DownloadResult,
  StorageItem,
  StorageMetadata,
} from '../interfaces/storage-provider.interface';
import { DOSpacesStorageConfig } from '../interfaces/storage-config.interface';
import {
  DOSpacesUploadOptions,
  DOSpacesMetadata,
} from '../interfaces/do-spaces-storage.interface';
import {
  StorageFileNotFoundError,
  normalizeStorageError,
} from '../utils/storage-errors';

/**
 * DigitalOcean Spaces implementation of StorageProvider
 * Uses S3-compatible API with DO Spaces specific features
 */
@Injectable()
export class DOSpacesStorageProvider implements StorageProvider {
  private readonly client: S3;
  private readonly config: DOSpacesStorageConfig;
  private readonly endpoint: string;

  constructor(config: DOSpacesStorageConfig) {
    this.config = config;
    this.endpoint = `https://${config.region}.digitaloceanspaces.com`;

    this.client = new S3({
      endpoint: this.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? false,
    });
  }

  /**
   * Upload a file to DO Spaces
   */
  public async upload(options: UploadOptions): Promise<StorageResult> {
    try {
      const uploadOptions = options as DOSpacesUploadOptions;
      const key = this.getObjectKey(options.path);

      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.config.space,
          Key: key,
          Body: Buffer.isBuffer(options.content)
            ? options.content
            : Readable.from(options.content),
          ContentType: options.contentType,
          ACL: options.acl || this.config.defaultAcl,
          CacheControl: uploadOptions.cacheControl,
          ContentDisposition: uploadOptions.contentDisposition,
          Metadata: options.metadata,
        },
      });

      const result = await upload.done();

      const metadata: DOSpacesMetadata = {
        contentType: options.contentType || 'application/octet-stream',
        size: Buffer.isBuffer(options.content) ? options.content.length : 0, // Size will be updated when getting metadata
        createdAt: new Date(),
        lastModified: new Date(),
        etag: result.ETag?.replace(/"/g, '') || '',
        acl: options.acl || this.config.defaultAcl,
        custom: options.metadata || {},
        cdnCacheTtl: uploadOptions.cdnCacheTtl,
        cdnUrl: this.getCdnUrl(key),
        customDomainUrl: this.getCustomDomainUrl(key),
      };

      return {
        path: options.path,
        size: metadata.size,
        contentType: metadata.contentType,
        lastModified: metadata.lastModified,
        url: this.getPublicUrl(key),
        metadata,
      };
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Download a file from DO Spaces
   */
  public async download(path: string): Promise<DownloadResult> {
    try {
      const key = this.getObjectKey(path);

      const result = await this.client.getObject({
        Bucket: this.config.space,
        Key: key,
      });

      if (!result.Body) {
        throw new StorageFileNotFoundError(path);
      }

      const metadata = await this.getMetadata(path);

      return {
        content: result.Body as Readable,
        contentType: metadata.contentType,
        size: metadata.size,
        metadata,
      };
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Delete a file from DO Spaces
   */
  public async delete(path: string): Promise<void> {
    try {
      const key = this.getObjectKey(path);

      await this.client.deleteObject({
        Bucket: this.config.space,
        Key: key,
      });
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Check if a file exists in DO Spaces
   */
  public async exists(path: string): Promise<boolean> {
    try {
      const key = this.getObjectKey(path);

      await this.client.headObject({
        Bucket: this.config.space,
        Key: key,
      });

      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        'name' in error &&
        error.name === 'NotFound'
      ) {
        return false;
      }
      throw normalizeStorageError(error);
    }
  }

  /**
   * List files in DO Spaces with optional prefix
   */
  public async list(prefix?: string): Promise<StorageItem[]> {
    try {
      const key = prefix ? this.getObjectKey(prefix) : undefined;

      const result = await this.client.listObjectsV2({
        Bucket: this.config.space,
        Prefix: key,
      });

      const items: StorageItem[] = [];

      if (!result.Contents) {
        return items;
      }

      for (const item of result.Contents) {
        if (!item.Key) continue;

        const path = this.getStoragePath(item.Key);
        items.push({
          path,
          isDirectory: item.Key.endsWith('/'),
          size: item.Size || 0,
          lastModified: item.LastModified || new Date(),
          contentType: undefined, // Would require additional HEAD request
        });
      }

      return items;
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Get metadata for a file in DO Spaces
   */
  public async getMetadata(path: string): Promise<StorageMetadata> {
    try {
      const key = this.getObjectKey(path);

      const result = await this.client.headObject({
        Bucket: this.config.space,
        Key: key,
      });

      const metadata: DOSpacesMetadata = {
        contentType: result.ContentType || 'application/octet-stream',
        size: result.ContentLength || 0,
        createdAt: new Date(),
        lastModified: result.LastModified || new Date(),
        etag: result.ETag?.replace(/"/g, '') || '',
        // acl: result.ACL as StorageAcl | undefined,
        custom: result.Metadata || {},
        cdnUrl: this.getCdnUrl(key),
        customDomainUrl: this.getCustomDomainUrl(key),
      };

      return metadata;
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Update metadata for a file in DO Spaces
   */
  public async updateMetadata(
    path: string,
    metadata: Partial<StorageMetadata>,
  ): Promise<StorageMetadata> {
    try {
      const key = this.getObjectKey(path);

      // Get current object metadata
      const currentMetadata = await this.getMetadata(path);

      // Copy object to itself with new metadata
      await this.client.copyObject({
        Bucket: this.config.space,
        CopySource: `/${this.config.space}/${key}`,
        Key: key,
        ContentType: metadata.contentType || currentMetadata.contentType,
        Metadata: {
          ...currentMetadata.custom,
          ...(metadata.custom || {}),
        },
        MetadataDirective: 'REPLACE',
      });

      // Get updated metadata
      return this.getMetadata(path);
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  /**
   * Get the full object key including root prefix
   */
  private getObjectKey(path: string): string {
    const normalizedPath = path.replace(/^\/+/, '');
    return this.config.rootPath
      ? `${this.config.rootPath.replace(/^\/+/, '')}/${normalizedPath}`
      : normalizedPath;
  }

  /**
   * Get the storage path from object key
   */
  private getStoragePath(key: string): string {
    if (!this.config.rootPath) {
      return key;
    }
    const prefix = this.config.rootPath.replace(/^\/+/, '');
    return key.startsWith(prefix)
      ? key.substring(prefix.length).replace(/^\/+/, '')
      : key;
  }

  /**
   * Get the public URL for an object
   */
  private getPublicUrl(key: string): string {
    if (this.config.useCdn && this.config.cdnEndpoint) {
      return `${this.config.cdnEndpoint.replace(/\/+$/, '')}/${key}`;
    }
    if (this.config.customDomain) {
      return `${this.config.customDomain.replace(/\/+$/, '')}/${key}`;
    }
    return `${this.endpoint}/${this.config.space}/${key}`;
  }

  /**
   * Get the CDN URL for an object if configured
   */
  private getCdnUrl(key: string): string | undefined {
    if (!this.config.cdnEndpoint) {
      return undefined;
    }
    return `${this.config.cdnEndpoint.replace(/\/+$/, '')}/${key}`;
  }

  /**
   * Get the custom domain URL for an object if configured
   */
  private getCustomDomainUrl(key: string): string | undefined {
    if (!this.config.customDomain) {
      return undefined;
    }
    return `${this.config.customDomain.replace(/\/+$/, '')}/${key}`;
  }
}
