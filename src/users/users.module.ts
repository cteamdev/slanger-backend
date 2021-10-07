import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CacheModule } from '@/common/cache/cache.module';
import { HelpersModule } from '@/common/helpers/helpers.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Settings } from './entities/settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Settings]),
    CacheModule,
    HelpersModule
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
