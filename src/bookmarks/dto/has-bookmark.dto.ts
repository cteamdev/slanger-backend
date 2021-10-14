import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class HasBookmarkDto {
  @IsInt()
  @ApiProperty()
  slangId: number;
}
