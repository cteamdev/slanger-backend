import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt } from 'class-validator';
import { Rights } from '@/common/types/rights.types';

export class SetUserRightsDto {
  @IsInt()
  @ApiProperty()
  id: number;

  @IsEnum(Rights)
  @ApiProperty({ enum: Rights })
  rights: Rights;
}
