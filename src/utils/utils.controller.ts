import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { ExcludeGuards } from '@/common/decorators/exclude-guards.decorator';
import { UtilsService } from './utils.service';

@Controller('utils')
@ApiCookieAuth('x-vk')
@ApiTags('Утилиты')
export class UtilsController {
  constructor(private readonly utilsService: UtilsService) {}

  @Post('/callback')
  @HttpCode(200)
  @ExcludeGuards()
  callback(@Body() payload: Record<string, any>): Promise<string | undefined> {
    return this.utilsService.callback(payload);
  }
}
