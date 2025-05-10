import { User, AdminSession } from '@prisma/client';
import { Request } from 'express';

/**
 * Extended user type with system admin flag
 */
export interface AuthUser extends User {
  isSystemAdmin: boolean;
}

/**
 * Custom request type with auth-specific properties
 * Properly extends the Express Request interface with auth-specific properties
 */
export interface RequestWithUser extends Request {
  user?: AuthUser;
  adminSession?: AdminSession;
}
