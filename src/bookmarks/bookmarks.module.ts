import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HelpersModule } from '@/common/helpers/helpers.module';
import { Slang } from '@/slangs/entities/slang.entity';
import { BookmarksService } from './bookmarks.service';
import { BookmarksController } from './bookmarks.controller';
import { Bookmark } from './entities/bookmark.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Slang, Bookmark]), HelpersModule],
  controllers: [BookmarksController],
  providers: [BookmarksService]
})
export class BookmarksModule {}
