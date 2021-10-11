import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';

import { Slang } from './slang.entity';

@Entity()
export class DaySlang {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Slang)
  slang: Slang;

  @Column()
  dateString: string = new Date().toDateString();

  constructor(options: Partial<DaySlang>) {
    Object.assign(this, options);
  }
}
