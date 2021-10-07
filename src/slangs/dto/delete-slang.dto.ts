import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class DeleteSlangDto {
  @IsInt()
  @ApiProperty()
  id: number;
}
