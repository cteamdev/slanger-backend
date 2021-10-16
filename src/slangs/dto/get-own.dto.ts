import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt } from 'class-validator';

export class GetOwnDto {
  @IsInt()
  @Transform(({ value }) => Number(value))
  @ApiProperty()
  offset: number;

  @IsInt()
  @Transform(({ value }) => Number(value))
  @ApiProperty()
  limit: number;
}
