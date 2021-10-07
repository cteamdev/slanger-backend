import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CreateBookmarkDto {
  @IsInt()
  @ApiProperty()
  slangId: number;
}
