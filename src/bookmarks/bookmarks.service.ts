import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Transactional } from 'typeorm-transactional-cls-hooked';
import { Repository } from 'typeorm';

import { HelpersService } from '@/common/helpers/helpers.service';
import { User } from '@/users/entities/user.entity';
import { Slang } from '@/slangs/entities/slang.entity';
import { Bookmark } from './entities/bookmark.entity';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { RemoveBookmarkDto } from './dto/remove-bookmark.dto';

@Injectable()
export class BookmarksService {
  constructor(
    private readonly helpersService: HelpersService,
    @InjectRepository(Slang)
    private readonly slangsRepository: Repository<Slang>,
    @InjectRepository(Bookmark)
    private readonly bookmarksRepository: Repository<Bookmark>
  ) {}

  async has(currentUser: User, slangId: number): Promise<Bookmark | undefined> {
    return this.bookmarksRepository.findOne(
      {
        slang: {
          id: slangId
        },
        user: {
          id: currentUser.id
        }
      },
      {
        relations: this.helpersService.getBookmarkRelations()
      }
    );
  }

  @Transactional()
  async create(
    currentUser: User,
    { slangId }: CreateBookmarkDto
  ): Promise<Bookmark | undefined> {
    const count: number = await this.bookmarksRepository.count({
      user: {
        id: currentUser.id
      }
    });
    if (count > 100)
      throw new HttpException('Слишком много закладок', HttpStatus.BAD_REQUEST);

    const slang: Slang | undefined = await this.slangsRepository.findOne({
      id: slangId
    });
    if (!slang) throw new HttpException('Не найдено', HttpStatus.NOT_FOUND);

    const foundBookmark: Bookmark | undefined =
      await this.bookmarksRepository.findOne({ slang: { id: slangId } });
    if (foundBookmark)
      throw new HttpException(
        'Этот слэнг уже есть в закладках',
        HttpStatus.BAD_REQUEST
      );

    const bookmark: Bookmark = await this.bookmarksRepository.save(
      new Bookmark({ slang, user: currentUser })
    );

    return bookmark;
  }

  @Transactional()
  async remove(
    currentUser: User,
    { id }: RemoveBookmarkDto
  ): Promise<Bookmark | undefined> {
    const bookmark: Bookmark | undefined =
      await this.bookmarksRepository.findOne(
        {
          id
        },
        {
          relations: this.helpersService.getBookmarkRelations()
        }
      );
    if (!bookmark) throw new HttpException('Не найдено', HttpStatus.NOT_FOUND);

    if (bookmark.user.id !== currentUser.id)
      throw new HttpException('Доступ запрещён', HttpStatus.FORBIDDEN);

    return this.bookmarksRepository.remove(bookmark);
  }
}
