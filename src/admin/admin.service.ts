import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectMeiliSearch } from 'nestjs-meilisearch';
import { MeiliSearch, Index, SearchResponse } from 'meilisearch';
import { Repository } from 'typeorm';

import { AdminMessage, HelpersService } from '@/common/helpers/helpers.service';
import { Rights } from '@/common/types/rights.types';
import { UsersService } from '@/users/users.service';
import { User } from '@/users/entities/user.entity';
import { Slang } from '@/slangs/entities/slang.entity';
import { SlangStatus } from '@/slangs/types/slang-status.types';
import { SlangType } from '@/slangs/types/slang-type.types';
import { SlangMeili } from '@/slangs/types/slang-meili.types';
import { SearchDto } from './dto/search.dto';
import { SetSlangStatusDto } from './dto/set-slang-status.dto';
import { SetUserRightsDto } from './dto/set-user-rights.dto';
import { stripIndents } from 'common-tags';

@Injectable()
export class AdminService {
  private readonly meiliIndex: Index<SlangMeili> =
    this.meiliSearch.index<SlangMeili>('slangs');

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
      sort: ['date:asc']
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
    if (!slang) throw new HttpException('Не найдено', HttpStatus.NOT_FOUND);
    if (slang.status === status)
      throw new HttpException(
        'Этот сленг уже имеет данный статус',
        HttpStatus.BAD_REQUEST
      );

    slang.status = status;
    await this.slangsRepository.save(slang);
    await this.meiliIndex.updateDocuments([Slang.toMeiliEntity(slang)]);

    if (slang.user) {
      const points = {
        [SlangType.WORD]: 8,
        [SlangType.COLLOCATION]: 10,
        [SlangType.PROVERB]: 12,
        [SlangType.PHRASEOLOGICAL_UNIT]: 12
      };

      if (status === SlangStatus.PUBLIC) {
        slang.user.points += points[slang.type];

        await this.usersRepository.save(slang.user);
      }

      const statuses = {
        [SlangStatus.MODERATING]: 'на модерации',
        [SlangStatus.DECLINED]: 'отклонён модерацией',
        [SlangStatus.PUBLIC]:
          'опубликован, вам ' +
          this.helpersService.pluralize(points[slang.type], [
            'начислен',
            'начислено',
            'начислено'
          ]) +
          ' ' +
          points[slang.type] +
          ' ' +
          this.helpersService.pluralize(points[slang.type], [
            'балл',
            'балла',
            'баллов'
          ])
      };

      this.usersService.sendNotification({
        user: slang.user,
        message: stripIndents`
          🧐 Новый статус сленга: ${statuses[status]}
          💁‍♂️ Если вы не согласны с мнением модерации, напишите в сообщество @slangerpub
        `,
        hash: 'slang?id=' + slang.id
      });

      if (slang.conversationMessageId) {
        const { text, params }: AdminMessage =
          await this.helpersService.getAdminMessage(slang);

        await this.helpersService.editAdminMessage(
          slang.conversationMessageId,
          text,
          params
        );
      }
    }

    return slang;
  }

  async setUserRights({
    id,
    rights
  }: SetUserRightsDto): Promise<User | undefined> {
    const user: User | undefined = await this.usersRepository.findOne({ id });
    if (!user) throw new HttpException('Не найдено', HttpStatus.NOT_FOUND);

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
      hash: 'profile?id=' + user.id
    });

    return user;
  }
}
