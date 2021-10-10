import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { UsersGetResponse } from 'vk-io/lib/api/schemas/responses';

import { HelpersService } from '@/common/helpers/helpers.service';
import { User } from './entities/user.entity';
import { Settings } from './entities/settings.entity';
import { VKInfoDto } from './dto/vk-info.dto';
import { SetSettingsDto } from './dto/set-settings.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly helpersService: HelpersService,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>
  ) {}

  getById(id: number): Promise<User | undefined> {
    return this.usersRepository.findOne(
      { id },
      { relations: this.helpersService.getUserRelations() }
    );
  }

  async setSettings(
    currentUser: User,
    body: SetSettingsDto
  ): Promise<User | undefined> {
    const relationsUser: User | undefined = await this.usersRepository.findOne(
      { id: currentUser.id },
      { relations: this.helpersService.getUserRelations() }
    );
    if (!relationsUser) return;

    Object.assign(relationsUser.settings, body);
    relationsUser.settings = await this.settingsRepository.save(
      relationsUser.settings
    );

    return relationsUser;
  }

  /**
   * Отправка уведомления пользователю
   */
  async sendNotification({
    user,
    message,
    hash
  }: {
    user: User;
    message: string;
    hash: string;
  }): Promise<void> {
    if (!user.settings) {
      const relationsUser: User | undefined =
        await this.usersRepository.findOne(
          { id: user.id },
          { relations: this.helpersService.getUserRelations() }
        );
      if (!relationsUser) return;

      user = relationsUser;
    }

    if (user.settings.push)
      await this.helpersService.sendNotification(user.id, message, hash);

    if (user.settings.im)
      await this.helpersService.sendMessage(
        user.id,
        message +
          '\nПодробнее: ' +
          this.helpersService.getConfig('APP_URL') +
          '#' +
          hash
      );
  }

  /**
   * Получение информации о профилях пользователей в ВК
   * с использованием кэша
   */
  getVKInfo(ids: number): Promise<VKInfoDto | undefined>;
  getVKInfo(ids: number[]): Promise<(VKInfoDto | undefined)[]>;
  async getVKInfo(
    ids: number | number[]
  ): Promise<VKInfoDto | undefined | (VKInfoDto | undefined)[]> {
    const isArray: boolean = Array.isArray(ids);

    // Из-за TS придется так сделать
    if (typeof ids === 'number') ids = [ids];

    const infosCache: VKInfoDto[] = await Promise.all(
      ids.map(
        (id: number) =>
          this.cacheManager.get('vkinfo-' + id.toString()) as Promise<
            VKInfoDto | undefined
          >
      )
    ).then(
      (data: (VKInfoDto | undefined)[]) =>
        data.filter((item: VKInfoDto | undefined) => item) as VKInfoDto[]
    );

    const idsNotCache: number[] = ids.filter(
      (id: number) => !infosCache.some((info: VKInfoDto) => info.id === id)
    );
    if (idsNotCache.length < 1) return infosCache;

    const data: UsersGetResponse =
      await this.helpersService.appVK.api.users.get({
        user_ids: idsNotCache.join(','),
        fields: ['photo_400', 'verified']
      });

    const infosApi: VKInfoDto[] = data.map(
      (user) =>
        ({
          id: user.id,
          avatarUrl: user.photo_400 ?? '',
          verified: user.verified ?? false,
          fullName: user.first_name + ' ' + user.last_name
        } as VKInfoDto)
    );

    const infos: (VKInfoDto | undefined)[] = ids.map(
      (id: number) =>
        infosCache.find((info: VKInfoDto) => info.id === id) ||
        infosApi.find((info: VKInfoDto) => info.id === id)
    );

    // Кэш на час
    for (const info of infos)
      if (info)
        await this.cacheManager.set('vkinfo-' + info.id.toString(), info, {
          ttl: 60 * 60
        });

    return isArray ? infos : infos[0];
  }
}
