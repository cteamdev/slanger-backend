import { User } from '@/users/entities/user.entity';
import { Slang } from '../entities/slang.entity';

export type SlangMeili = Omit<Slang, 'user'> & {
  userId: number | undefined;
  user: Pick<User, 'id' | 'vk'> | undefined;
};
