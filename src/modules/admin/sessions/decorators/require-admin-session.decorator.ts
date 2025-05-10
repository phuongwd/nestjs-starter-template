import { applyDecorators, UseGuards } from '@nestjs/common';
import { AdminSessionGuard } from '../guards/admin-session.guard';

/**
 * Decorator to require an active admin session
 * Used for sensitive admin operations that require session tracking
 */
export const RequireAdminSession = () =>
  applyDecorators(UseGuards(AdminSessionGuard));
