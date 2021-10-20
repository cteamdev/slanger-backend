import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsOptional,
  isString,
  IsString,
  Length,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';

import { TransformZalgo } from '@/common/decorators/transform-zalgo.decorator';
import { SlangType } from '../types/slang-type.types';
import { SlangTheme } from '../types/slang-theme.types';

@ValidatorConstraint()
class IsUniqueThemeArray implements ValidatorConstraintInterface {
  public validate(data: unknown): boolean {
    const found: string[] = [];

    return (
      Array.isArray(data) &&
      data.every((value: unknown) => {
        if (
          isString(value) &&
          Object.values(SlangTheme).some((theme: string) => value === theme) &&
          !found.some((theme: string) => value === theme)
        ) {
          found.push(value);
          return true;
        } else return false;
      })
    );
  }
}

export class CreateSlangDto {
  @IsEnum(SlangType)
  @ApiProperty({
    enum: SlangType
  })
  type: SlangType;

  @Validate(IsUniqueThemeArray, {
    message:
      'themes.0.each property of themes should be a member of SlangTheme and unique'
  })
  @ArrayMinSize(0)
  @ArrayMaxSize(Object.keys(SlangTheme).length)
  @ApiProperty({
    enum: SlangTheme,
    isArray: true
  })
  themes: SlangTheme[];

  @IsString()
  @IsOptional()
  @Length(1, 200)
  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 200
  })
  cover?: string;

  @IsString()
  @Length(1, 250)
  @TransformZalgo()
  @ApiProperty({
    minLength: 1,
    maxLength: 250
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

  @IsBoolean()
  @ApiPropertyOptional()
  fromEdition: boolean;
}
