import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const ExcludeGuards = (): CustomDecorator<string> =>
  SetMetadata('excludeGuards', true);
