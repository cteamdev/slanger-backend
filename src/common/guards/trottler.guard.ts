import { ThrottlerGuard as NestThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ThrottlerGuard extends NestThrottlerGuard {
  protected errorMessage: string =
    'Превышен рейт-лимит. Попробуйте ещё раз позже';
}
