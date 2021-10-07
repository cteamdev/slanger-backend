import { TransformZalgo } from '@/common/decorators/transform-zalgo.decorator';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsString,
  Length
} from 'class-validator';

import { SlangType } from '../types/slang-type.types';

export class CreateSlangDto {
  @IsString()
  @Length(1, 40)
  @TransformZalgo()
  @ApiProperty({
    minLength: 1,
    maxLength: 40
  })
  word: string;

  @IsEnum(SlangType)
  @ApiProperty({
    enum: SlangType
  })
  type: SlangType;

  @IsString()
  @Length(1, 1000)
  @TransformZalgo()
  @ApiProperty({
    minLength: 1,
    maxLength: 1000
  })
  description: string;

  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(5)
  @ApiProperty({
    minItems: 0,
    maxItems: 5
  })
  attachments: string[];
}
