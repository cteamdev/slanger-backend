import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { User } from '@/users/entities/user.entity';
import { Request } from '@/common/types/request.types';

export const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator =
  createParamDecorator((data: unknown, ctx: ExecutionContext): User => {
    const request: Request = ctx.switchToHttp().getRequest();

    return request.currentUser;
  });
