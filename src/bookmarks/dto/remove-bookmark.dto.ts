import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class RemoveBookmarkDto {
  @IsInt()
  @ApiProperty()
  id: number;
}
