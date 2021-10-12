import { Logger, OnModuleInit } from '@nestjs/common';
import { InjectMeiliSearch } from 'nestjs-meilisearch';
import { MeiliSearch, Index } from 'meilisearch';

import { Slang } from '@/slangs/entities/slang.entity';

export class AppService implements OnModuleInit {
  private readonly logger: Logger = new Logger(AppService.name);
  private readonly meiliIndex: Index<Slang> =
    this.meiliSearch.index<Slang>('slangs');

  constructor(@InjectMeiliSearch() private readonly meiliSearch: MeiliSearch) {}

  async onModuleInit(): Promise<void> {
    // Ловим необработанные ошибки
    process.on('unhandledRejection', (reason) => {
      this.logger.error(reason);
    });

    // Настройка MeiliSearch
    await this.meiliIndex.updateSettings({
      filterableAttributes: ['status'],
      sortableAttributes: ['date'],
      searchableAttributes: ['type', 'cover', 'word', 'description']
    });
  }
}
