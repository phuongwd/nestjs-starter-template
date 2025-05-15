import { Injectable } from '@nestjs/common';
import { StorageProvider } from '../interfaces/storage-provider.interface';
import {
  StorageProviderConfig,
  StorageProviderType,
  LocalStorageConfig,
  S3StorageConfig,
  DOSpacesStorageConfig,
  GitHubStorageConfig,
} from '../interfaces/storage-config.interface';
import { LocalStorageProvider } from './local-storage.provider';
import { StorageConfigurationError } from '../utils/storage-errors';
import { IStorageProviderFactory } from '../interfaces/storage-provider-factory.interface';
import { S3StorageProvider } from './s3-storage.provider';
import { DOSpacesStorageProvider } from './do-spaces-storage.provider';
import { GitHubStorageProvider } from './github-storage.provider';

/**
 * @class StorageProviderFactory
 * @implements {IStorageProviderFactory}
 * @description Factory for creating storage provider instances based on configuration
 *
 * Usage:
 * ```typescript
 * @Inject(INJECTION_TOKENS.FACTORY.STORAGE_PROVIDER)
 * private readonly providerFactory: IStorageProviderFactory
 * ```
 */
@Injectable()
export class StorageProviderFactory implements IStorageProviderFactory {
  /**
   * Create a new storage provider instance
   */
  public createProvider(config: StorageProviderConfig): StorageProvider {
    switch (config.type) {
      case StorageProviderType.LOCAL:
        return this.createLocalProvider(config);
      case StorageProviderType.S3:
        return this.createS3Provider(config);
      case StorageProviderType.DO_SPACES:
        return this.createDOSpacesProvider(config);
      case StorageProviderType.GITHUB:
        return this.createGitHubProvider(config);
      default:
        throw new StorageConfigurationError(
          `Unsupported storage provider type: ${JSON.stringify(config)}`,
        );
    }
  }

  /**
   * Create a local storage provider
   */
  private createLocalProvider(config: LocalStorageConfig): StorageProvider {
    if (!config.directory) {
      throw new StorageConfigurationError(
        'Local storage directory is required',
      );
    }
    return new LocalStorageProvider(config);
  }

  /**
   * Create an S3 storage provider
   */
  private createS3Provider(config: S3StorageConfig): StorageProvider {
    if (
      !config.bucket ||
      !config.region ||
      !config.accessKeyId ||
      !config.secretAccessKey
    ) {
      throw new StorageConfigurationError(
        'Invalid S3 configuration: missing required fields',
      );
    }
    return new S3StorageProvider(config);
  }

  /**
   * Create a DigitalOcean Spaces storage provider
   */
  private createDOSpacesProvider(
    config: DOSpacesStorageConfig,
  ): StorageProvider {
    if (
      !config.space ||
      !config.region ||
      !config.accessKeyId ||
      !config.secretAccessKey
    ) {
      throw new StorageConfigurationError(
        'Invalid DO Spaces configuration: missing required fields',
      );
    }
    return new DOSpacesStorageProvider(config);
  }

  /**
   * Create a GitHub repository storage provider
   */
  private createGitHubProvider(config: GitHubStorageConfig): StorageProvider {
    if (!config.owner || !config.repo || !config.token) {
      throw new StorageConfigurationError(
        'Invalid GitHub configuration: missing required fields (owner, repo, token)',
      );
    }
    return new GitHubStorageProvider(config);
  }
}
