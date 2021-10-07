import { FastifyRequest } from 'fastify';

import { User } from '@/users/entities/user.entity';

export type Request = FastifyRequest & {
  currentUserId: number;
  currentUser: User;
};
