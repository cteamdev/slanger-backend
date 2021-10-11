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

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Groups } from '@/common/types/groups.types';
import { User } from '@/users/entities/user.entity';
import { SlangsService } from './slangs.service';
import { Slang } from './entities/slang.entity';
import { Vote } from './entities/vote.entity';
import { CreateSlangDto } from './dto/create-slang.dto';
import { EditSlangDto } from './dto/edit-slang.dto';
import { DeleteSlangDto } from './dto/delete-slang.dto';
import { VoteSlangDto } from './dto/vote-slang.dto';
import { SearchDto } from './dto/search.dto';

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

  @Get('/getDaySlang')
  @ApiResponse({ status: 200, type: Slang })
  @ApiNotFoundResponse()
  getDaySlang(): Promise<Slang | undefined> {
    return this.slangsService.getDaySlang();
  }

  @Get('/getVote')
  @ApiResponse({ status: 200, type: Vote })
  @ApiNotFoundResponse()
  getVote(
    @CurrentUser() currentUser: User,
    @Query('id') id: number
  ): Promise<Vote | undefined> {
    return this.slangsService.getVote(currentUser, id);
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

  @Post('/vote')
  @ApiResponse({ status: 200, type: Slang })
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  vote(
    @CurrentUser() currentUser: User,
    @Body() body: VoteSlangDto
  ): Promise<Slang | undefined> {
    return this.slangsService.vote(currentUser, body);
  }
}
