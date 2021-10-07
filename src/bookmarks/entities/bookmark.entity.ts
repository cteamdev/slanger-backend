import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Slang } from '@/slangs/entities/slang.entity';
import { User } from '@/users/entities/user.entity';

@Entity()
export class Bookmark {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id: number;

  @ManyToOne(() => User, (user) => user.bookmarks)
  user: User;

  @ManyToOne(() => Slang)
  @ApiProperty()
  slang: Slang;

  @Column('timestamp')
  @ApiProperty()
  date: Date = new Date();

  constructor(options: Partial<Bookmark>) {
    Object.assign(this, options);
  }
}
