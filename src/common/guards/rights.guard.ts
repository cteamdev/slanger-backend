import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Request } from '@/common/types/request.types';
import { Rights } from '@/common/types/rights.types';
import { User } from '@/users/entities/user.entity';

@Injectable()
export class RightsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.reflector.get<boolean>('excludeGuards', context.getHandler()))
      return true;

    const request: Request = context.switchToHttp().getRequest();
    const user: User = request.currentUser;

    if (user.rights === Rights.BANNED)
      throw new HttpException('Вы забанены', HttpStatus.FORBIDDEN);

    const rights: Rights[] = this.reflector.get<Rights[]>(
      'rights',
      context.getHandler()
    );
    if (!rights) return true;

    return rights.includes(user.rights);
  }
}
