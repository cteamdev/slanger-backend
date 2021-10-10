import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectMeiliSearch } from 'nestjs-meilisearch';
import { MeiliSearch, Index, SearchResponse } from 'meilisearch';
import { Repository } from 'typeorm';

import { HelpersService } from '@/common/helpers/helpers.service';
import { Rights } from '@/common/types/rights.types';
import { UsersService } from '@/users/users.service';
import { User } from '@/users/entities/user.entity';
import { Slang } from '@/slangs/entities/slang.entity';
import { SlangStatus } from '@/slangs/types/slang-status.types';
import { SearchDto } from './dto/search.dto';
import { SetSlangStatusDto } from './dto/set-slang-status.dto';
import { SetUserRightsDto } from './dto/set-user-rights.dto';

@Injectable()
export class AdminService {
  private readonly meiliIndex: Index<Slang> =
    this.meiliSearch.index<Slang>('slangs');

  constructor(
    private readonly helpersService: HelpersService,
    private readonly usersService: UsersService,
    @InjectMeiliSearch() private readonly meiliSearch: MeiliSearch,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Slang)
    private readonly slangsRepository: Repository<Slang>
  ) {}

  async search({
    q,
    offset,
    limit
  }: SearchDto): Promise<SearchResponse<Slang>> {
    return this.meiliIndex.search(q, {
      offset,
      limit,
      filter: ['status = moderating'],
      sort: ['date:desc']
    });
  }

  async setSlangStatus({
    id,
    status
  }: SetSlangStatusDto): Promise<Slang | undefined> {
    const slang: Slang | undefined = await this.slangsRepository.findOne(
      {
        id
      },
      {
        relations: this.helpersService.getSlangRelations()
      }
    );
    if (!slang) return;

    slang.status = status;
    await this.slangsRepository.save(slang);
    await this.meiliIndex.updateDocuments([slang]);

    if (slang.user) {
      const ru = {
        [SlangStatus.MODERATING]: 'на модерации',
        [SlangStatus.DECLINED]: 'отклонён модерацией',
        [SlangStatus.PUBLIC]: 'опубликован'
      };

      this.usersService.sendNotification({
        user: slang.user,
        message: `🧐 Новый статус слэнга: ${ru[status]}`,
        hash: 'slang?id=' + slang.id
      });
    }

    return slang;
  }

  async setUserRights({
    id,
    rights
  }: SetUserRightsDto): Promise<User | undefined> {
    const user: User | undefined = await this.usersRepository.findOne({ id });
    if (!user) return;

    if (user.rights >= Rights.ADMIN)
      throw new HttpException(
        'Невозможно поменять права администратору',
        HttpStatus.FORBIDDEN
      );

    user.rights = rights;
    await this.usersRepository.save(user);

    const ru = {
      [Rights.BANNED]: 'забанены',
      [Rights.USER]: 'пользователь',
      [Rights.MODERATOR]: 'модератор',
      [Rights.ADMIN]: 'администратор'
    };

    this.usersService.sendNotification({
      user,
      message: `😉 Вам выданы новые права, теперь вы ${ru[user.rights]}`,
      hash: 'user?id=' + user.id
    });

    return user;
  }
}
