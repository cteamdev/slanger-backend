import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt } from 'class-validator';

import { SlangStatus } from '@/slangs/types/slang-status.types';

export class SetSlangStatusDto {
  @IsInt()
  @ApiProperty()
  id: number;

  @IsEnum(SlangStatus)
  @ApiProperty({ enum: SlangStatus })
  status: SlangStatus;
}
