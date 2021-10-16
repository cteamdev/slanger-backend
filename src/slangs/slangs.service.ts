import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectMeiliSearch } from 'nestjs-meilisearch';
import { MeiliSearch, Index, SearchResponse } from 'meilisearch';
import { Repository } from 'typeorm';
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
  private readonly meiliIndex: Index<Slang> =
    this.meiliSearch.index<SlangMeili>('slangs');

  constructor(
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
    const dayLimit: number = 10;

    if (
      currentUser.rights === Rights.USER &&
      currentUser.dayLimitDate &&
      currentUser.dayLimitDate.toDateString() === new Date().toDateString() &&
      currentUser.dayLimitCount >= dayLimit
    )
      throw new HttpException(
        'Дневной лимит (10 слов) истёк, возвращайтесь завтра',
        HttpStatus.BAD_REQUEST
      );

    const slang: Slang = await this.slangsRepository.save(
      new Slang({ ...body, user: currentUser })
    );
    await this.meiliIndex.addDocuments([
      { ...slang, userId: slang.user?.id } as SlangMeili
    ]);

    if (
      !currentUser.dayLimitDate ||
      currentUser.dayLimitDate.toDateString() !== new Date().toDateString()
    ) {
      currentUser.dayLimitDate = new Date();
      currentUser.dayLimitCount = 1;
    } else currentUser.dayLimitCount++;

    await this.usersRepository.save(currentUser);

    const format: string = formatRelative(slang.date, new Date(), {
      locale: ru
    });
    const link: string =
      this.helpersService.getConfig('APP_URL') + '#slang?id=' + slang.id;
    this.helpersService.sendAdminMessage(stripIndents`
      📩 Новый слэнг на модерации

      🔢 ID: ${slang.id}
      🧐 Автор: @id${currentUser.id}
      ⏰ Дата: ${format} по МСК

      📌 Слово: ${slang.word}
      🎬 Тип: ${slang.type}
      📖 Краткое описание: ${slang.description}

      📎 Ссылка на модерацию: ${link}
    `);

    return slang;
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

    if (!slang.user || slang.user.id !== currentUser.id)
      throw new HttpException('Доступ запрещён', HttpStatus.FORBIDDEN);
    if (slang.status !== SlangStatus.MODERATING)
      throw new HttpException(
        'Редактировать можно только слэнги на модерации',
        HttpStatus.BAD_REQUEST
      );

    Object.assign(slang, body);
    await this.slangsRepository.save(slang);

    await this.meiliIndex.updateDocuments([
      { ...slang, userId: slang.user?.id } as SlangMeili
    ]);

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

    if (!slang.user || slang.user.id !== currentUser.id)
      throw new HttpException('Доступ запрещён', HttpStatus.FORBIDDEN);

    await this.slangsRepository.remove(slang);
    await this.meiliIndex.deleteDocument(id);

    return slang;
  }
}
