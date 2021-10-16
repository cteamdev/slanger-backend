import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  SerializeOptions
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { SearchResponse } from 'meilisearch';
import { classToPlain } from 'class-transformer';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Groups } from '@/common/types/groups.types';
import { User } from '@/users/entities/user.entity';
import { SlangsService } from './slangs.service';
import { Slang } from './entities/slang.entity';
import { CreateSlangDto } from './dto/create-slang.dto';
import { EditSlangDto } from './dto/edit-slang.dto';
import { DeleteSlangDto } from './dto/delete-slang.dto';
import { SearchDto } from './dto/search.dto';
import { GetOwnDto } from './dto/get-own.dto';

@Controller('slangs')
@ApiCookieAuth('x-vk')
@ApiTags('Слэнги')
export class SlangsController {
  constructor(private readonly slangsService: SlangsService) {}

  @Get('/search')
  @ApiResponse({ status: 200 })
  search(@Query() query: SearchDto): Promise<SearchResponse<Slang>> {
    return this.slangsService.search(query);
  }

  @Get('/getById')
  @ApiResponse({ status: 200, type: Slang })
  @ApiNotFoundResponse()
  async getById(
    @CurrentUser() currentUser: User,
    @Query('id') id: number
  ): Promise<Slang> {
    const slang: Slang = await this.slangsService.getById(id);

    return slang.user?.id === currentUser.id
      ? (classToPlain(slang, {
          groups: [Groups.CURRENT_USER]
        }) as Slang)
      : slang;
  }

  @Get('/getOwn')
  @SerializeOptions({ groups: [Groups.CURRENT_USER] })
  @ApiResponse({ status: 200, type: [Slang] })
  getOwn(
    @CurrentUser() currentUser: User,
    @Query() query: GetOwnDto
  ): Promise<SearchResponse<Slang>> {
    return this.slangsService.getOwn(currentUser, query);
  }

  @Get('/getRandom')
  @ApiResponse({ status: 200, type: Slang })
  getRandom(): Promise<Slang | undefined> {
    return this.slangsService.getRandom();
  }

  @Post('/create')
  @SerializeOptions({ groups: [Groups.CURRENT_USER] })
  @ApiResponse({ status: 200, type: Slang })
  @ApiBadRequestResponse()
  create(
    @CurrentUser() currentUser: User,
    @Body() body: CreateSlangDto
  ): Promise<Slang> {
    return this.slangsService.create(currentUser, body);
  }

  @Post('/edit')
  @SerializeOptions({ groups: [Groups.CURRENT_USER] })
  @ApiResponse({ status: 200, type: Slang })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  edit(
    @CurrentUser() currentUser: User,
    @Body() body: EditSlangDto
  ): Promise<Slang | undefined> {
    return this.slangsService.edit(currentUser, body);
  }

  @Post('/delete')
  @SerializeOptions({ groups: [Groups.CURRENT_USER] })
  @ApiResponse({ status: 200, type: Slang })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  delete(
    @CurrentUser() currentUser: User,
    @Body() body: DeleteSlangDto
  ): Promise<Slang | undefined> {
    return this.slangsService.delete(currentUser, body);
  }
}
