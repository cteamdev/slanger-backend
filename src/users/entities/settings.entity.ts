import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn
} from 'typeorm';

import { User } from './user.entity';

@Entity()
export class Settings {
  @PrimaryGeneratedColumn()
  @Exclude()
  id: number;

  @JoinColumn()
  @OneToOne(() => User, (user) => user.settings)
  @Exclude()
  user: User;

  @Column()
  @ApiProperty()
  push: boolean = false;

  @Column()
  @ApiProperty()
  im: boolean = false;
}
