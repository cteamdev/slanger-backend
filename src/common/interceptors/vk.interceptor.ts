import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  PlainLiteralObject
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { UsersService } from '@/users/users.service';
import { VKInfoDto } from '@/users/dto/vk-info.dto';

@Injectable()
export class VKInterceptor implements NestInterceptor {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(UsersService) private readonly usersService: UsersService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      // Ищем все поля `vk` и заменяем их
      // С массивами это тоже работает
      map((data: PlainLiteralObject) =>
        data instanceof Object ? this.findAndReplace(data) : data
      )
    );
  }

  async findAndReplace(data: PlainLiteralObject): Promise<Record<string, any>> {
    const found: Record<string, any> = this.findOrReplace(data);
    const infos: (VKInfoDto | undefined)[] = await this.usersService.getVKInfo(
      Object.values(found)
    );

    for (const [index, key] of Object.entries(Object.keys(found)))
      found[key] = infos[+index];

    return this.findOrReplace(data, found);
  }

  findOrReplace(
    data: PlainLiteralObject,
    replace?: Record<string, any>,
    parent?: string
  ): Record<string, any> {
    const found: Record<string, any> = {};
    const output: Record<string, any> = Object.assign(
      Array.isArray(data) ? [] : {},
      data
    );

    for (const [field, value] of Object.entries(data)) {
      const path: string = parent ? parent + '.' + field : field;

      if (
        typeof value === 'object' &&
        value !== null &&
        Object.keys(value).length > 0
      )
        Object.assign(
          replace ? output[field] : found,
          this.findOrReplace(value, replace, path)
        );
      else if (
        field === 'vk' &&
        data.vk === true &&
        typeof data.id === 'number'
      ) {
        if (replace) output[field] = replace[path];
        else found[path] = data.id;
      }
    }

    return replace ? output : found;
  }
}
