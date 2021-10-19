import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Exclude } from 'class-transformer';

import { User } from '@/users/entities/user.entity';
import { SlangStatus } from '../types/slang-status.types';
import { SlangType } from '../types/slang-type.types';
import { SlangMeili } from '../types/slang-meili.types';

@Entity()
export class Slang {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id: number;

  @ManyToOne(() => User, (user) => user.slangs, { nullable: true })
  @ApiPropertyOptional({ type: () => User })
  user: User | null;

  @Column()
  @ApiProperty({ enum: SlangType })
  type: SlangType;

  @Column({ nullable: true })
  @ApiPropertyOptional()
  cover?: string;

  @Column()
  @ApiProperty()
  word: string;

  @Column()
  @ApiProperty()
  description: string;

  @Column({ nullable: true })
  @Exclude()
  conversationMessageId?: number;

  @Column()
  @ApiProperty({ enum: SlangStatus })
  status: SlangStatus = SlangStatus.MODERATING;

  @Column('timestamp')
  @ApiProperty()
  date: Date = new Date();

  constructor(options: Partial<Slang>) {
    Object.assign(this, options);
  }

  toMeiliEntity(): SlangMeili {
    return {
      ...this,
      userId: this.user?.id,
      user: this.user
        ? {
            id: this.user.id,
            vk: this.user.vk
          }
        : undefined
    };
  }
}
