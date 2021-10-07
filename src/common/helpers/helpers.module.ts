import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HelpersService } from './helpers.service';

@Module({
  imports: [ConfigModule],
  providers: [HelpersService],
  exports: [HelpersService]
})
export class HelpersModule {}
