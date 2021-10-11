import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { InjectMeiliSearch } from 'nestjs-meilisearch';
import { MeiliSearch, Index, SearchResponse } from 'meilisearch';
import { Between, Repository } from 'typeorm';
import { stripIndents } from 'common-tags';
import { formatRelative } from 'date-fns';
import { ru } from 'date-fns/locale';

import { HelpersService } from '@/common/helpers/helpers.service';
import { Rights } from '@/common/types/rights.types';
import { User } from '@/users/entities/user.entity';
import { Slang } from './entities/slang.entity';
import { DaySlang } from './entities/day-slang.entity';
import { Vote } from './entities/vote.entity';
import { SlangStatus } from './types/slang-status.types';
import { VoteType } from './types/vote-type.types';
import { CreateSlangDto } from './dto/create-slang.dto';
import { EditSlangDto } from './dto/edit-slang.dto';
import { DeleteSlangDto } from './dto/delete-slang.dto';
import { VoteSlangDto } from './dto/vote-slang.dto';
import { SearchDto } from './dto/search.dto';

@Injectable()
export class SlangsService {
  private readonly logger: Logger = new Logger(SlangsService.name);
  private readonly meiliIndex: Index<Slang> =
    this.meiliSearch.index<Slang>('slangs');

  constructor(
    private readonly helpersService: HelpersService,
    @InjectMeiliSearch() private readonly meiliSearch: MeiliSearch,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Slang)
    private readonly slangsRepository: Repository<Slang>,
    @InjectRepository(DaySlang)
    private readonly daySlangRepository: Repository<DaySlang>,
    @InjectRepository(Vote)
    private readonly votesRepository: Repository<Vote>
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

  async getDaySlang(): Promise<Slang | undefined> {
    const daySlang: DaySlang | undefined =
      await this.daySlangRepository.findOne(
        {
          dateString: new Date().toDateString()
        },
        {
          relations: [
            'slang',
            ...this.helpersService
              .getSlangRelations()
              .map((rel) => 'slang.' + rel)
          ]
        }
      );
    if (!daySlang) return;

    return daySlang.slang;
  }

  async getVote(currentUser: User, id: number): Promise<Vote | undefined> {
    const slang: Slang | undefined = await this.slangsRepository.findOne(
      {
        id
      },
      {
        relations: this.helpersService.getSlangRelations()
      }
    );
    if (!slang) return;

    const vote: Vote | undefined = slang.votes.find(
      (vote) => vote.user.id === currentUser.id
    );

    return vote;
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
    await this.meiliIndex.addDocuments([slang]);

    currentUser.dayLimitCount++;
    currentUser.dayLimitDate = new Date();
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
    if (!slang) return;

    if (!slang.user || slang.user.id !== currentUser.id)
      throw new HttpException('Доступ запрещён', HttpStatus.FORBIDDEN);
    if (slang.status !== SlangStatus.MODERATING)
      throw new HttpException(
        'Редактировать можно только слэнги на модерации',
        HttpStatus.BAD_REQUEST
      );

    Object.assign(slang, body);
    await this.slangsRepository.save(slang);

    await this.meiliIndex.updateDocuments([slang]);

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
    if (!slang) return;

    if (!slang.user || slang.user.id !== currentUser.id)
      throw new HttpException('Доступ запрещён', HttpStatus.FORBIDDEN);

    await this.slangsRepository.remove(slang);
    await this.meiliIndex.deleteDocument(id);

    return slang;
  }

  async vote(
    currentUser: User,
    { id, type }: VoteSlangDto
  ): Promise<Slang | undefined> {
    const slang: Slang | undefined = await this.slangsRepository.findOne(
      {
        id
      },
      {
        relations: this.helpersService.getSlangRelations()
      }
    );
    if (!slang) return;

    if (slang.user && slang.user.id === currentUser.id)
      throw new HttpException(
        'Нельзя проголосовать за свой слэнг',
        HttpStatus.BAD_REQUEST
      );
    if (slang.status !== SlangStatus.PUBLIC)
      throw new HttpException(
        'Голосовать можно только за публичные слэнги',
        HttpStatus.BAD_REQUEST
      );

    let vote: Vote | undefined = slang.votes.find(
      (vote) => vote.user.id === currentUser.id
    );
    if (type === VoteType.VOID) {
      if (!vote) return slang;
      else {
        await this.votesRepository.remove(vote);
        slang.votes = slang.votes.filter(
          (vote) => vote.user.id !== currentUser.id
        );

        await this.meiliIndex.updateDocuments([slang]);
        return slang;
      }
    }
    if (!vote) {
      vote = new Vote({ user: currentUser, type });
      await this.votesRepository.save(vote);

      slang.votes.push(vote);
      await this.slangsRepository.save(slang);
      await this.meiliIndex.updateDocuments([slang]);

      return slang;
    }
    if (vote.type === type) return slang;

    vote.type = type;
    await this.votesRepository.save(vote);

    await this.meiliIndex.updateDocuments([slang]);
    return slang;
  }

  @Cron('1 0 0 * * *', {
    name: 'calcDaySlang',
    timeZone: 'Europe/Moscow'
  })
  async calcDaySlang(): Promise<void> {
    this.logger.log('Подсчёт слова дня...');

    const foundDaySlang: DaySlang | undefined =
      await this.daySlangRepository.findOne({
        dateString: new Date().toDateString()
      });
    if (foundDaySlang) return;

    const today: Date = new Date(new Date().toDateString());
    const tomorrow: Date = new Date(
      new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString()
    );
    const slangs: Slang[] = await this.slangsRepository.find({
      where: {
        status: SlangStatus.PUBLIC,
        date: Between(today, tomorrow)
      },
      relations: ['votes']
    });

    type CountSlang = { slang: Slang; votes: number };

    const map: CountSlang[] = slangs.map((slang) => ({
      slang,
      votes:
        slang.votes.length > 0
          ? slang.votes
              .map((vote) => (vote.type === VoteType.DOWN ? -1 : 1) as number)
              .reduce((pv, cv) => pv + cv)
          : 0
    }));
    const sort: CountSlang[] = map.sort((a, b) => b.votes - a.votes);

    const slang: Slang = sort[0].slang;
    const daySlang: DaySlang = new DaySlang({ slang });

    await this.daySlangRepository.save(daySlang);
  }
}
