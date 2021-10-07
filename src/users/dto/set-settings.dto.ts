import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetSettingsDto {
  @IsBoolean()
  @ApiProperty()
  push: boolean;

  @IsBoolean()
  @ApiProperty()
  im: boolean;
}
