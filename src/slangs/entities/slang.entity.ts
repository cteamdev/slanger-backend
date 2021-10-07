import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

import { User } from '@/users/entities/user.entity';
import { SlangStatus } from '../types/slang-status.types';
import { SlangType } from '../types/slang-type.types';

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
  word: string;

  @Column()
  @ApiProperty()
  description: string;

  @Column()
  @ApiProperty()
  type: SlangType;

  @Column()
  @ApiProperty()
  status: SlangStatus = SlangStatus.MODERATING;

  @Column('text', { array: true })
  @ApiProperty()
  attachments: string[];

  @Column('timestamp')
  @ApiProperty()
  date: Date = new Date();

  constructor(options: Partial<Slang>) {
    Object.assign(this, options);
  }
}
