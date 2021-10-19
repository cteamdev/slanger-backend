import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectMeiliSearch } from 'nestjs-meilisearch';
import { MeiliSearch, Index, SearchResponse } from 'meilisearch';
import { EntityManager, Repository } from 'typeorm';
import {
  ButtonColor,
  DocumentAttachment,
  Keyboard,
  KeyboardBuilder
} from 'vk-io';
import { stripIndents } from 'common-tags';
import { formatRelative } from 'date-fns';
import { ru } from 'date-fns/locale';

import { HelpersService } from '@/common/helpers/helpers.service';
import { Rights } from '@/common/types/rights.types';
import { User } from '@/users/entities/user.entity';
import { Slang } from './entities/slang.entity';
import { SlangStatus } from './types/slang-status.types';
import { SlangMeili } from './types/slang-meili.types';
import { CreateSlangDto } from './dto/create-slang.dto';
import { EditSlangDto } from './dto/edit-slang.dto';
import { DeleteSlangDto } from './dto/delete-slang.dto';
import { SearchDto } from './dto/search.dto';
import { GetOwnDto } from './dto/get-own.dto';

@Injectable()
export class SlangsService {
  private readonly logger: Logger = new Logger(SlangsService.name);
  private readonly meiliIndex: Index<SlangMeili> =
    this.meiliSearch.index<SlangMeili>('slangs');

  constructor(
    private readonly manager: EntityManager,
    private readonly helpersService: HelpersService,
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
      filter: ['status = public'],
      sort: ['date:desc']
    });
  }

  async getById(id: number): Promise<Slang> {
    const slang: Slang | undefined = await this.slangsRepository.findOne(
      {
        id
      },
      {
        relations: this.helpersService.getSlangRelations()
      }
    );
    if (!slang) throw new HttpException('Не найдено', HttpStatus.NOT_FOUND);

    return slang;
  }

  async getOwn(
    currentUser: User,
    { offset, limit }: GetOwnDto
  ): Promise<SearchResponse<Slang>> {
    return this.meiliIndex.search('', {
      offset,
      limit,
      filter: ['userId = ' + currentUser.id],
      sort: ['date:desc']
    });
  }

  async getRandom(): Promise<Slang | undefined> {
    const random: Slang | undefined = await this.slangsRepository
      .createQueryBuilder()
      .select()
      .where({ status: SlangStatus.PUBLIC })
      .orderBy('RANDOM()')
      .getOne();
    if (!random) return;

    const slang: Slang | undefined = await this.slangsRepository.findOne(
      {
        id: random.id
      },
      {
        relations: this.helpersService.getSlangRelations()
      }
    );

    return slang;
  }

  async create(currentUser: User, body: CreateSlangDto): Promise<Slang> {
    return this.manager.transaction(
      async (transactionManager: EntityManager) => {
        currentUser = (await transactionManager.findOne(
          User,
          { id: currentUser.id },
          { lock: { mode: 'pessimistic_write' } }
        )) as User;

        const dayLimit: number = 10;
        if (
          currentUser.rights === Rights.USER &&
          currentUser.dayLimitDate &&
          currentUser.dayLimitDate.toDateString() ===
            new Date().toDateString() &&
          currentUser.dayLimitCount >= dayLimit
        )
          throw new HttpException(
            'Дневной лимит (10 слов) истёк, возвращайтесь завтра',
            HttpStatus.BAD_REQUEST
          );

        const user: User | undefined =
          body.fromEdition &&
          [Rights.MODERATOR, Rights.ADMIN].includes(currentUser.rights)
            ? undefined
            : currentUser;

        const slang: Slang = await transactionManager.save(
          new Slang({ ...body, user })
        );
        await this.meiliIndex.addDocuments([slang.toMeiliEntity()]);

        if (user) {
          if (
            !currentUser.dayLimitDate ||
            currentUser.dayLimitDate.toDateString() !==
              new Date().toDateString()
          ) {
            currentUser.dayLimitDate = new Date();
            currentUser.dayLimitCount = 1;
          } else currentUser.dayLimitCount++;

          await transactionManager.save(currentUser);

          setImmediate(async () => {
            const format: string = formatRelative(slang.date, new Date(), {
              locale: ru
            });
            const link: string =
              this.helpersService.getConfig('APP_URL') +
              '#slang?id=' +
              slang.id;

            const upload: DocumentAttachment | undefined =
              await this.helpersService.uploadCover(slang.cover);

            const { conversation_message_id } =
              await this.helpersService.sendAdminMessage(
                stripIndents`
                📩 Новый слэнг на модерации
          
                🔢 ID: ${slang.id}
                🧐 Автор: @id${currentUser.id}
                ⏰ Дата: ${format} по МСК
          
                📌 Слово: ${slang.word}
                🎬 Тип: ${slang.type}
                📖 Краткое описание: ${slang.description}
          
                📎 Ссылка на модерацию: ${link}
              `,
                {
                  attachment: upload?.toString(),
                  keyboard: this.getKeyboard(slang.id)
                }
              );

            slang.conversationMessageId = conversation_message_id;
            await this.slangsRepository.save(slang);
          });
        }

        return slang;
      }
    );
  }

  async edit(
    currentUser: User,
    body: EditSlangDto
  ): Promise<Slang | undefined> {
    const slang: Slang | undefined = await this.slangsRepository.findOne(
      {
        id: body.id
      },
      {
        relations: this.helpersService.getSlangRelations()
      }
    );
    if (!slang) throw new HttpException('Не найдено', HttpStatus.NOT_FOUND);

    const isModerator: boolean = [Rights.MODERATOR, Rights.ADMIN].includes(
      currentUser.rights
    );

    if (!isModerator && (!slang.user || slang.user.id !== currentUser.id))
      throw new HttpException('Доступ запрещён', HttpStatus.FORBIDDEN);
    if (!isModerator && slang.status !== SlangStatus.MODERATING)
      throw new HttpException(
        'Редактировать можно только слэнги на модерации',
        HttpStatus.BAD_REQUEST
      );

    Object.assign(slang, body);
    await this.slangsRepository.save(slang);

    await this.meiliIndex.updateDocuments([slang.toMeiliEntity()]);

    setImmediate(async () => {
      if (slang.conversationMessageId) {
        const format: string = formatRelative(slang.date, new Date(), {
          locale: ru
        });
        const link: string =
          this.helpersService.getConfig('APP_URL') + '#slang?id=' + slang.id;

        const upload: DocumentAttachment | undefined =
          await this.helpersService.uploadCover(slang.cover);

        await this.helpersService.editAdminMessage(
          slang.conversationMessageId,
          stripIndents`
            📩 Новый слэнг на модерации (ред.)
      
            🔢 ID: ${slang.id}
            🧐 Автор: @id${currentUser.id}
            ⏰ Дата: ${format} по МСК
      
            📌 Слово: ${slang.word}
            🎬 Тип: ${slang.type}
            📖 Краткое описание: ${slang.description}
      
            📎 Ссылка на модерацию: ${link}
          `,
          {
            attachment: upload?.toString(),
            keyboard: this.getKeyboard(slang.id)
          }
        );
      }
    });

    return slang;
  }

  async delete(
    currentUser: User,
    { id }: DeleteSlangDto
  ): Promise<Slang | undefined> {
    const slang: Slang | undefined = await this.slangsRepository.findOne(
      {
        id
      },
      {
        relations: this.helpersService.getSlangRelations()
      }
    );
    if (!slang) throw new HttpException('Не найдено', HttpStatus.NOT_FOUND);

    const isModerator: boolean = [Rights.MODERATOR, Rights.ADMIN].includes(
      currentUser.rights
    );

    if (!isModerator && (!slang.user || slang.user.id !== currentUser.id))
      throw new HttpException('Доступ запрещён', HttpStatus.FORBIDDEN);

    await this.slangsRepository.remove(slang);
    await this.meiliIndex.deleteDocument(id);

    return slang;
  }

  private getKeyboard(slangId: number): KeyboardBuilder {
    return Keyboard.builder()
      .inline()
      .callbackButton({
        label: 'Отклонить',
        color: ButtonColor.NEGATIVE,
        payload: { action: 'declined', slangId }
      })
      .callbackButton({
        label: 'Одобрить',
        color: ButtonColor.POSITIVE,
        payload: { action: 'public', slangId }
      });
  }
}
