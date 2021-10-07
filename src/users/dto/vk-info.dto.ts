import { ApiProperty } from '@nestjs/swagger';

export class VKInfoDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  verified: boolean;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  avatarUrl: string;

  constructor(options: Partial<VKInfoDto>) {
    Object.assign(this, options);
  }
}
