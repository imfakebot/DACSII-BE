import { Request } from 'express';
import { RoleEnum } from '../enums/role.enum';

export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: RoleEnum;
  };
}
