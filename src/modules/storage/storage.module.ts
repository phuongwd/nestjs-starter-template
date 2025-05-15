import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StorageService } from './services/storage.service';
import { StorageCacheService } from './services/storage-cache.service';
import { StorageController } from './controllers/storage.controller';
import { StorageProviderFactory } from './providers/storage-provider.factory';
import { INJECTION_TOKENS } from './constants/injection-tokens';
import { StorageProviderConfigService } from './services/storage-provider-config.service';
import { StorageProviderConfigController } from './controllers/storage-provider-config.controller';
import { StorageProviderConfigRepository } from './repositories/storage-provider-config.repository';
import storageConfig from '../../config/storage.config';

/**
 * Storage module for file operations
 * Provides file upload, download, and management capabilities
 */
@Module({
  imports: [
    ConfigModule.forFeature(storageConfig),
    // Use memory storage for file uploads
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [StorageController, StorageProviderConfigController],
  providers: [
    {
      provide: INJECTION_TOKENS.SERVICE.STORAGE,
      useClass: StorageService,
    },
    StorageCacheService,
    {
      provide: INJECTION_TOKENS.FACTORY.STORAGE_PROVIDER,
      useClass: StorageProviderFactory,
    },
    {
      provide: INJECTION_TOKENS.REPOSITORY.STORAGE_PROVIDER_CONFIG,
      useClass: StorageProviderConfigRepository,
    },
    {
      provide: INJECTION_TOKENS.SERVICE.STORAGE_PROVIDER_CONFIG,
      useClass: StorageProviderConfigService,
    },
  ],
  exports: [
    INJECTION_TOKENS.SERVICE.STORAGE,
    INJECTION_TOKENS.FACTORY.STORAGE_PROVIDER,
    INJECTION_TOKENS.SERVICE.STORAGE_PROVIDER_CONFIG,
    StorageCacheService,
  ],
})
export class StorageModule {}
