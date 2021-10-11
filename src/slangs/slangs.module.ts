import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HelpersModule } from '@/common/helpers/helpers.module';
import { User } from '@/users/entities/user.entity';
import { Slang } from './entities/slang.entity';
import { DaySlang } from './entities/day-slang.entity';
import { Vote } from './entities/vote.entity';
import { SlangsService } from './slangs.service';
import { SlangsController } from './slangs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Slang, DaySlang, Vote]),
    HelpersModule
  ],
  controllers: [SlangsController],
  providers: [SlangsService]
})
export class SlangsModule {}
