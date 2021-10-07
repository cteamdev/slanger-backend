import { Body, Controller, Post, SerializeOptions } from '@nestjs/common';
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
import { SlangsService } from './slangs.service';
import { Slang } from './entities/slang.entity';
import { CreateSlangDto } from './dto/create-slang.dto';
import { EditSlangDto } from './dto/edit-slang.dto';
import { DeleteSlangDto } from './dto/delete-slang.dto';

@Controller('slangs')
@ApiCookieAuth('x-vk')
@ApiTags('Слэнги')
export class SlangsController {
  constructor(private readonly slangsService: SlangsService) {}

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
