import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HelpersModule } from '@/common/helpers/helpers.module';
import { UsersModule } from '@/users/users.module';
import { User } from '@/users/entities/user.entity';
import { Slang } from '@/slangs/entities/slang.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Slang]),
    HelpersModule,
    UsersModule
  ],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
