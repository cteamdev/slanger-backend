import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class SearchDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  q?: string;

  @IsInt()
  @Transform(({ value }) => Number(value))
  @ApiProperty()
  offset: number;

  @IsInt()
  @Transform(({ value }) => Number(value))
  @ApiProperty()
  limit: number;
}
