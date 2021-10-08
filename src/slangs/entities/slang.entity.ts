import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany
} from 'typeorm';

import { User } from '@/users/entities/user.entity';
import { SlangStatus } from '../types/slang-status.types';
import { SlangType } from '../types/slang-type.types';
import { Vote } from './vote.entity';

@Entity()
export class Slang {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id: number;

  @ManyToOne(() => User, (user) => user.slangs, { nullable: true })
  @ApiPropertyOptional({ type: () => User })
  user: User | null;

  @Column()
  @ApiProperty()
  type: SlangType;

  @Column()
  @ApiProperty()
  cover: string;

  @Column()
  @ApiProperty()
  word: string;

  @Column()
  @ApiProperty()
  description: string;

  @OneToMany(() => Vote, (vote) => vote.slang)
  @ApiProperty({ type: () => Vote })
  votes: Vote[];

  @Column()
  @ApiProperty()
  status: SlangStatus = SlangStatus.MODERATING;

  @Column('timestamp')
  @ApiProperty()
  date: Date = new Date();

  constructor(options: Partial<Slang>) {
    Object.assign(this, options);
  }
}
