import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StorageService } from './services/storage.service';
import { StorageCacheService } from './services/storage-cache.service';
import { StorageController } from './controllers/storage.controller';
import { StorageProviderFactory } from './providers/storage-provider.factory';
import { INJECTION_TOKENS } from './constants/injection-tokens';
import storageConfig from '../../config/storage.config';
import { TenantContextMiddleware } from '@/shared/middleware/tenant-context.middleware';

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
  controllers: [StorageController],
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
  ],
  exports: [
    INJECTION_TOKENS.SERVICE.STORAGE,
    INJECTION_TOKENS.FACTORY.STORAGE_PROVIDER,
    StorageCacheService,
  ],
})
export class StorageModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes(StorageController);
  }
}
