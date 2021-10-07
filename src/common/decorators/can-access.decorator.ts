import { CustomDecorator, SetMetadata } from '@nestjs/common';

import { Rights } from '@/common/types/rights.types';

export const CanAccess = (...rights: Rights[]): CustomDecorator<string> =>
  SetMetadata('rights', rights);
