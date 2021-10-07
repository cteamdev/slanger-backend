import { Controller, Post, Body, SerializeOptions } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Groups } from '@/common/types/groups.types';
import { User } from '@/users/entities/user.entity';
import { BookmarksService } from './bookmarks.service';
import { Bookmark } from './entities/bookmark.entity';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { RemoveBookmarkDto } from './dto/remove-bookmark.dto';

@Controller('bookmarks')
@ApiCookieAuth('x-vk')
@ApiTags('Закладки')
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post('/create')
  @SerializeOptions({ groups: [Groups.CURRENT_USER] })
  @ApiResponse({ status: 200, type: Bookmark })
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  create(
    @CurrentUser() currentUser: User,
    @Body() body: CreateBookmarkDto
  ): Promise<Bookmark | undefined> {
    return this.bookmarksService.create(currentUser, body);
  }

  @Post('/remove')
  @SerializeOptions({ groups: [Groups.CURRENT_USER] })
  @ApiResponse({ status: 200, type: Bookmark })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  remove(
    @CurrentUser() currentUser: User,
    @Body() body: RemoveBookmarkDto
  ): Promise<Bookmark | undefined> {
    return this.bookmarksService.remove(currentUser, body);
  }
}
