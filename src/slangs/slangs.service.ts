import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectMeiliSearch } from 'nestjs-meilisearch';
import { MeiliSearch, Index, SearchResponse } from 'meilisearch';
import { EntityManager, Repository } from 'typeorm';

import { AdminMessage, HelpersService } from '@/common/helpers/helpers.service';
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
        if (
          body.cover &&
          !/^http(?:s|):\/\/media\d+.giphy.com\/media\/[\w\d]+\/giphy.gif(?:\/|)$/.test(
            body.cover
          )
        )
          throw new HttpException(
            'В обложках разрешены ссылки только на giphy.com',
            HttpStatus.BAD_REQUEST
          );

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

        const user: User | null =
          body.fromEdition &&
          [Rights.MODERATOR, Rights.ADMIN].includes(currentUser.rights)
            ? null
            : currentUser;

        const slang: Slang = await transactionManager.save(
          transactionManager.create(Slang, { ...body, user })
        );
        await this.meiliIndex.addDocuments([Slang.toMeiliEntity(slang)], {
          primaryKey: 'id'
        });

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
            const { text, params }: AdminMessage =
              await this.helpersService.getAdminMessage(slang);

            const { conversation_message_id } =
              await this.helpersService.sendAdminMessage(text, params);

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
        'Редактировать можно только сленги на модерации',
        HttpStatus.BAD_REQUEST
      );

    const user: User | null =
      body.fromEdition &&
      [Rights.MODERATOR, Rights.ADMIN].includes(currentUser.rights)
        ? null
        : slang.user;

    Object.assign(slang, body, { user });
    await this.slangsRepository.save(slang);

    await this.meiliIndex.updateDocuments([Slang.toMeiliEntity(slang)]);

    setImmediate(async () => {
      if (slang.conversationMessageId) {
        const { text, params }: AdminMessage =
          await this.helpersService.getAdminMessage(slang, true);

        await this.helpersService.editAdminMessage(
          slang.conversationMessageId,
          text,
          params
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
}
