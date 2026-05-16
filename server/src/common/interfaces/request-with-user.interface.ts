import type { Request } from 'express';

export interface RequestWithUser extends Request {
  user: {
    userId: number;
    username: string;
    roleCode: string;
  };
}
