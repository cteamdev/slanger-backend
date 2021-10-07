import { Module } from '@nestjs/common';

import { CacheModule } from '@/common/cache/cache.module';
import { ThrottlerStorageService } from './throttler-storage.service';

@Module({
  imports: [CacheModule],
  providers: [ThrottlerStorageService],
  exports: [ThrottlerStorageService]
})
export class ThrottlerStorageModule {}
