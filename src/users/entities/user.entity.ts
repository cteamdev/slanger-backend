import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  Entity,
  Column,
  PrimaryColumn,
  OneToOne,
  JoinColumn,
  OneToMany
} from 'typeorm';

import { Groups } from '@/common/types/groups.types';
import { Rights } from '@/common/types/rights.types';
import { Slang } from '@/slangs/entities/slang.entity';
import { Bookmark } from '@/bookmarks/entities/bookmark.entity';
import { VKInfoDto } from '../dto/vk-info.dto';
import { Settings } from './settings.entity';

@Entity()
export class User {
  @PrimaryColumn()
  @ApiProperty()
  id: number;

  @Column()
  @ApiProperty()
  points: number = 0;

  @Column()
  @ApiProperty()
  rights: Rights = Rights.USER;

  @Column()
  @ApiProperty()
  ref: string = 'other';

  @Column('timestamp')
  @ApiProperty()
  registration: Date = new Date();

  @Column('timestamp', { nullable: true })
  @Expose({ groups: [Groups.CURRENT_USER] })
  @ApiPropertyOptional({ type: Date })
  dayLimitDate: Date | null;

  @Column()
  @Expose({ groups: [Groups.CURRENT_USER] })
  @ApiPropertyOptional()
  dayLimitCount: number = 0;

  @OneToMany(() => Slang, (slang) => slang.user)
  @ApiProperty({ type: [Slang] })
  slangs: Slang[];

  @OneToMany(() => Bookmark, (bookmark) => bookmark.user)
  @ApiProperty({ type: [Bookmark] })
  bookmarks: Bookmark[];

  @JoinColumn()
  @OneToOne(() => Settings)
  @Expose({ groups: [Groups.CURRENT_USER] })
  @ApiPropertyOptional()
  settings: Settings;

  @ApiProperty({ type: VKInfoDto })
  vk: boolean = true;

  constructor(options: Partial<User>) {
    Object.assign(this, options);
  }
}
