import { registerAs } from '@nestjs/config';
import path from 'path';
import os from 'os';
import {
  StorageModuleConfig,
  StorageProviderType,
  LocalStorageConfig,
  S3StorageConfig,
  DOSpacesStorageConfig,
  GitHubStorageConfig,
} from '../modules/storage/interfaces/storage-config.interface';

/**
 * Storage configuration factory function
 * Creates storage configuration based on environment variables
 */
const createStorageConfig = (): StorageModuleConfig => {
  // Get default provider type from env
  const providerType =
    process.env.STORAGE_PROVIDER || StorageProviderType.LOCAL;

  // Default storage configuration
  const config = {
    defaultQuota: parseInt(
      process.env.STORAGE_DEFAULT_QUOTA || '1073741824',
      10,
    ), // 1GB
    cacheTtl: parseInt(process.env.STORAGE_CACHE_TTL || '3600000', 10), // 1 hour
    maxConcurrentUploads: parseInt(
      process.env.STORAGE_MAX_CONCURRENT_UPLOADS || '5',
      10,
    ),
    tempDir: process.env.STORAGE_TEMP_DIR || os.tmpdir(),
  } as Partial<StorageModuleConfig>;

  // Configure based on provider type
  switch (providerType) {
    case StorageProviderType.LOCAL:
      config.defaultProvider = {
        type: StorageProviderType.LOCAL,
        directory:
          process.env.STORAGE_LOCAL_DIRECTORY ||
          path.join(process.cwd(), 'storage'),
        baseUrl: process.env.STORAGE_LOCAL_BASE_URL,
        rootPath: process.env.STORAGE_LOCAL_ROOT_PATH,
      } as LocalStorageConfig;
      break;

    case StorageProviderType.S3:
      if (
        !process.env.STORAGE_S3_REGION ||
        !process.env.STORAGE_S3_BUCKET ||
        !process.env.STORAGE_S3_ACCESS_KEY ||
        !process.env.STORAGE_S3_SECRET_KEY
      ) {
        throw new Error('Missing required S3 configuration parameters');
      }

      config.defaultProvider = {
        type: StorageProviderType.S3,
        region: process.env.STORAGE_S3_REGION,
        bucket: process.env.STORAGE_S3_BUCKET,
        accessKeyId: process.env.STORAGE_S3_ACCESS_KEY,
        secretAccessKey: process.env.STORAGE_S3_SECRET_KEY,
        endpoint: process.env.STORAGE_S3_ENDPOINT,
        baseUrl: process.env.STORAGE_S3_BASE_URL,
        rootPath: process.env.STORAGE_S3_ROOT_PATH,
      } as S3StorageConfig;
      break;

    case StorageProviderType.DO_SPACES:
      if (
        !process.env.STORAGE_DO_REGION ||
        !process.env.STORAGE_DO_SPACE ||
        !process.env.STORAGE_DO_ACCESS_KEY ||
        !process.env.STORAGE_DO_SECRET_KEY
      ) {
        throw new Error(
          'Missing required DigitalOcean Spaces configuration parameters',
        );
      }

      config.defaultProvider = {
        type: StorageProviderType.DO_SPACES,
        region: process.env.STORAGE_DO_REGION,
        space: process.env.STORAGE_DO_SPACE,
        accessKeyId: process.env.STORAGE_DO_ACCESS_KEY,
        secretAccessKey: process.env.STORAGE_DO_SECRET_KEY,
        cdnEndpoint: process.env.STORAGE_DO_CDN_ENDPOINT,
        customDomain: process.env.STORAGE_DO_CUSTOM_DOMAIN,
        useCdn: process.env.STORAGE_DO_USE_CDN === 'true',
        forcePathStyle: process.env.STORAGE_DO_FORCE_PATH_STYLE === 'true',
        rootPath: process.env.STORAGE_DO_ROOT_PATH,
      } as DOSpacesStorageConfig;

      break;

    case StorageProviderType.GITHUB:
      if (
        !process.env.STORAGE_GITHUB_TOKEN ||
        !process.env.STORAGE_GITHUB_OWNER ||
        !process.env.STORAGE_GITHUB_REPO
      ) {
        throw new Error('Missing required GitHub configuration parameters');
      }

      config.defaultProvider = {
        type: StorageProviderType.GITHUB,
        token: process.env.STORAGE_GITHUB_TOKEN,
        owner: process.env.STORAGE_GITHUB_OWNER,
        repo: process.env.STORAGE_GITHUB_REPO,
        branch: process.env.STORAGE_GITHUB_BRANCH || 'main',
        basePath: process.env.STORAGE_GITHUB_BASE_PATH,
        useRawUrl: process.env.STORAGE_GITHUB_USE_RAW_URL !== 'false',
        customDomain: process.env.STORAGE_GITHUB_CUSTOM_DOMAIN,
        rootPath: process.env.STORAGE_GITHUB_ROOT_PATH,
      } as GitHubStorageConfig;
      break;

    default:
      throw new Error(`Unsupported storage provider type: ${providerType}`);
  }

  return config as StorageModuleConfig;
};

/**
 * Storage configuration
 * Defines default storage settings and provider configurations
 */
export const storageConfig = registerAs(
  'storage',
  (): StorageModuleConfig => createStorageConfig(),
);

export default storageConfig;
