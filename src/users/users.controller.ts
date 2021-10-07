import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  SerializeOptions
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiResponse,
  ApiNotFoundResponse,
  ApiTags
} from '@nestjs/swagger';
import { classToPlain } from 'class-transformer';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Groups } from '@/common/types/groups.types';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { SetSettingsDto } from './dto/set-settings.dto';

@Controller('users')
@ApiCookieAuth('x-vk')
@ApiTags('Пользователи')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/getById')
  @ApiResponse({ status: 200, type: User })
  @ApiNotFoundResponse()
  async getById(
    @CurrentUser() currentUser: User,
    @Query('id') id: number
  ): Promise<User | undefined> {
    const user: User | undefined = await this.usersService.getById(id);

    return currentUser.id === id
      ? (classToPlain(user, {
          groups: [Groups.CURRENT_USER]
        }) as User)
      : user;
  }

  @Post('/setSettings')
  @SerializeOptions({ groups: [Groups.CURRENT_USER] })
  @ApiResponse({ status: 201, type: User })
  setSettings(
    @CurrentUser() user: User,
    @Body() body: SetSettingsDto
  ): Promise<User | undefined> {
    return this.usersService.setSettings(user, body);
  }
}
