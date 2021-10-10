import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { SearchResponse } from 'meilisearch';

import { CanAccess } from '@/common/decorators/can-access.decorator';
import { Rights } from '@/common/types/rights.types';
import { User } from '@/users/entities/user.entity';
import { Slang } from '@/slangs/entities/slang.entity';
import { AdminService } from './admin.service';
import { SearchDto } from './dto/search.dto';
import { SetSlangStatusDto } from './dto/set-slang-status.dto';
import { SetUserRightsDto } from './dto/set-user-rights.dto';

@Controller('admin')
@ApiCookieAuth('x-vk')
@ApiTags('Админка')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('/search')
  @CanAccess(Rights.MODERATOR, Rights.ADMIN)
  @ApiResponse({ status: 200 })
  search(@Query() query: SearchDto): Promise<SearchResponse<Slang>> {
    return this.adminService.search(query);
  }

  @Post('/setSlangStatus')
  @CanAccess(Rights.MODERATOR, Rights.ADMIN)
  @ApiResponse({ status: 200, type: Slang })
  @ApiNotFoundResponse()
  setSlangStatus(@Body() body: SetSlangStatusDto): Promise<Slang | undefined> {
    return this.adminService.setSlangStatus(body);
  }

  @Post('/setUserRights')
  @CanAccess(Rights.ADMIN)
  @ApiResponse({ status: 200, type: User })
  @ApiNotFoundResponse()
  setUserRights(@Body() body: SetUserRightsDto): Promise<User | undefined> {
    return this.adminService.setUserRights(body);
  }
}
