import { Logger, Module, type Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import type { StorageProvider } from '@custom-merch/shared';

import { InMemoryStorageProvider } from './in-memory-storage.provider';
import { MinioStorageProvider } from './minio-storage.provider';
import { STORAGE_PROVIDER } from './storage.tokens';

const log = new Logger('StorageModule');

/**
 * Resolves the active StorageProvider from env. Defaults to MinIO in dev; if
 * the credentials are missing OR the configured S3 endpoint is unreachable,
 * the in-memory provider is used so the API remains usable in test envs.
 */
const storageFactory: Provider<StorageProvider> = {
  provide: STORAGE_PROVIDER,
  inject: [ConfigService],
  useFactory: async (config: ConfigService): Promise<StorageProvider> => {
    const endpoint = config.get<string>('S3_ENDPOINT');
    const accessKeyId = config.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('S3_SECRET_ACCESS_KEY');
    const bucket = config.get<string>('S3_BUCKET');

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      log.warn('S3 credentials missing — using in-memory storage provider');
      return new InMemoryStorageProvider();
    }

    const minio = new MinioStorageProvider({
      endpoint,
      region: config.get<string>('S3_REGION') ?? 'us-east-1',
      accessKeyId,
      secretAccessKey,
      bucket,
      forcePathStyle: (config.get<string>('S3_FORCE_PATH_STYLE') ?? 'true') === 'true',
      publicBaseUrl: config.get<string>('S3_PUBLIC_BASE_URL'),
    });

    const reachable = await minio.healthCheck();
    if (!reachable) {
      log.warn(`MinIO at ${endpoint} unreachable — falling back to in-memory storage`);
      return new InMemoryStorageProvider();
    }
    log.log(`storage provider: minio @ ${endpoint} (bucket=${bucket})`);
    return minio;
  },
};

@Module({
  imports: [ConfigModule],
  providers: [storageFactory],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
