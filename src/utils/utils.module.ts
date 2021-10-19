import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { HelpersModule } from '@/common/helpers/helpers.module';
import { User } from '@/users/entities/user.entity';
import { Slang } from '@/slangs/entities/slang.entity';
import { UtilsService } from './utils.service';
import { UtilsController } from './utils.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Slang]),
    ConfigModule,
    HelpersModule
  ],
  controllers: [UtilsController],
  providers: [UtilsService]
})
export class UtilsModule {}
