import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt } from 'class-validator';

import { VoteType } from '../types/vote-type.types';

export class VoteSlangDto {
  @IsInt()
  @ApiProperty()
  id: number;

  @IsEnum(VoteType)
  @ApiProperty({ enum: VoteType })
  type: VoteType;
}
