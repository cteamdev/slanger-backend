import { OnModuleInit } from '@nestjs/common';
import { InjectMeiliSearch } from 'nestjs-meilisearch';
import { MeiliSearch, Index } from 'meilisearch';

import { Slang } from '@/slangs/entities/slang.entity';

export class AppService implements OnModuleInit {
  private readonly meiliIndex: Index<Slang> =
    this.meiliSearch.index<Slang>('slangs');

  constructor(@InjectMeiliSearch() private readonly meiliSearch: MeiliSearch) {}

  async onModuleInit(): Promise<void> {
    // Настройка MeiliSearch
    await this.meiliIndex.updateSettings({
      filterableAttributes: ['status'],
      sortableAttributes: ['date']
    });
  }
}
