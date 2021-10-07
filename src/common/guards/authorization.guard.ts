import * as crypto from 'crypto';

import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { parse, stringify } from 'querystring';
import { Cache } from 'cache-manager';

import { Request } from '@/common/types/request.types';
import { User } from '@/users/entities/user.entity';
import { Settings } from '@/users/entities/settings.entity';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.get<boolean>('excludeGuards', context.getHandler()))
      return true;

    const request: Request = context.switchToHttp().getRequest();

    const vk: string = request.headers['x-vk'] as string;
    if (!vk) throw new HttpException('Доступ запрещен', HttpStatus.FORBIDDEN);

    const data: Record<string, unknown> = parse(vk);
    const id: number = Number.parseInt(data.vk_user_id as string);
    const sign: string = data.sign as string;

    const cachedSign: string | undefined = await this.cacheManager.get(
      'sign-' + id.toString()
    );
    if (sign && sign !== '' && sign === cachedSign)
      return this.checkUser(request, data);

    const signParams: Record<string, any> = {};

    for (const key of Object.keys(data).sort())
      if (key.slice(0, 3) === 'vk_') signParams[key] = data[key];

    const stringParams: string = stringify(signParams);

    const signHash: string = crypto
      .createHmac('sha256', this.configService.get('APP_SECRET') || '')
      .update(stringParams)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=$/, '');
    if (sign !== signHash)
      throw new HttpException('Доступ запрещен', HttpStatus.FORBIDDEN);

    if (
      Date.now() - Number.parseInt(data['vk_ts'] as string) * 1000 >
      12 * 60 * 60 * 1000
    )
      throw new HttpException('Доступ запрещен', HttpStatus.FORBIDDEN);

    // Кэшируем на час
    await this.cacheManager.set('sign-' + id.toString(), sign, {
      ttl: 60 * 60
    });

    return this.checkUser(request, data);
  }

  async checkUser(
    request: Request,
    data: Record<string, unknown>
  ): Promise<boolean> {
    const id: number = Number.parseInt(data.vk_user_id as string);

    let user: User | undefined = await this.usersRepository.findOne({ id });
    if (!user) {
      const settings: Settings = new Settings();
      await this.settingsRepository.save(settings);

      user = new User({ id, settings });
      if (data.vk_ref) user.ref = data.vk_ref as string;

      await this.usersRepository.save(user);
    }

    request.currentUserId = id;
    request.currentUser = user;

    return true;
  }
}