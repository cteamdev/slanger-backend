import { ApiProperty } from '@nestjs/swagger';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

import { User } from '@/users/entities/user.entity';
import { VoteType } from '../types/vote-type.types';
import { Slang } from './slang.entity';

@Entity()
export class Vote {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id: number;

  @ManyToOne(() => User)
  @ApiProperty({ type: () => User })
  user: User;

  @ManyToOne(() => Slang, (slang) => slang.votes)
  @ApiProperty({ type: () => Slang })
  slang: Slang;

  @Column()
  @ApiProperty()
  type: VoteType;

  constructor(options: Partial<Vote>) {
    Object.assign(this, options);
  }
}
