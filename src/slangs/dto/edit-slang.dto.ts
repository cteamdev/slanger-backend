import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

import { CreateSlangDto } from './create-slang.dto';

export class EditSlangDto extends PartialType(CreateSlangDto) {
  @IsInt()
  @ApiProperty()
  id: number;
}
