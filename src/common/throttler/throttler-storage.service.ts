import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { ThrottlerStorage } from './throttler-storage.interface';

@Injectable()
export class ThrottlerStorageService implements ThrottlerStorage {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async getRecord(key: string): Promise<number[]> {
    const result: number[] | undefined = await this.cacheManager.get<number[]>(
      key
    );

    return result ?? [];
  }

  async addRecord(key: string, ttl: number): Promise<void> {
    await this.cacheManager.set(key, ttl);
  }
}
