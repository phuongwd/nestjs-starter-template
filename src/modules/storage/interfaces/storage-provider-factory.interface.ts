import { StorageProvider } from './storage-provider.interface';
import { StorageProviderConfig } from './storage-config.interface';

/**
 * @interface IStorageProviderFactory
 * @description Factory contract for creating storage provider instances
 *
 * Requirements:
 * - Must create providers based on configuration
 * - Must handle different provider types
 * - Must implement error handling
 */
export interface IStorageProviderFactory {
  /**
   * Create a storage provider instance based on configuration
   * @param config Storage provider configuration
   * @returns StorageProvider instance
   */
  createProvider(config: StorageProviderConfig): StorageProvider;
}
