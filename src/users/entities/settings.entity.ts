import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Settings {
  @PrimaryGeneratedColumn()
  @Exclude()
  id: number;

  @Column()
  @ApiProperty()
  push: boolean = false;

  @Column()
  @ApiProperty()
  im: boolean = false;
}
