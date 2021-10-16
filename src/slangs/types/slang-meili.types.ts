import { Slang } from '../entities/slang.entity';

export type SlangMeili = Slang & {
  userId: number | undefined;
};
