import * as redisStore from 'cache-manager-redis-store';

import { Module, CacheModule as NestCacheModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * CacheModule от Nest не умеет глобально регистрироваться,
 * поэтому регистрируем его тут со всеми настройками и экспортируем
 */
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT')
      }),
      inject: [ConfigService]
    })
  ],
  exports: [NestCacheModule]
})
export class CacheModule {}
