import { TransformZalgo } from '@/common/decorators/transform-zalgo.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

import { SlangType } from '../types/slang-type.types';

export class CreateSlangDto {
  @IsEnum(SlangType)
  @ApiProperty({
    enum: SlangType
  })
  type: SlangType;

  @IsString()
  @IsOptional()
  @Length(1, 200)
  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 200
  })
  cover: string | null;

  @IsString()
  @Length(1, 40)
  @TransformZalgo()
  @ApiProperty({
    minLength: 1,
    maxLength: 40
  })
  word: string;

  @IsString()
  @Length(1, 1000)
  @TransformZalgo()
  @ApiProperty({
    minLength: 1,
    maxLength: 1000
  })
  description: string;
}
