import {
  Controller,
  Get,
  Post,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminSessionService } from '../services/admin-session.service';
import { SystemAdminGuard } from '../../system-roles/guards/system-admin.guard';
import { AdminSessionGuard } from '../guards/admin-session.guard';
import { RequestWithUser } from '@/modules/auth/types/user.types';
import { AdminAuditService } from '../../audit/services/admin-audit.service';

/**
 * Controller for managing admin sessions
 * Provides endpoints for session creation, validation, and revocation
 */
@ApiTags('Admin Sessions')
@Controller('admin/sessions')
@UseGuards(SystemAdminGuard)
@ApiBearerAuth()
export class AdminSessionController {
  constructor(
    private readonly sessionService: AdminSessionService,
    private readonly auditService: AdminAuditService,
  ) {}

  /**
   * Create a new admin session (login)
   */
  @Post()
  @ApiOperation({ summary: 'Create new admin session' })
  @ApiResponse({
    status: 201,
    description: 'Admin session created successfully.',
  })
  async createSession(@Req() req: RequestWithUser) {
    const session = await this.sessionService.createSession({
      userId: req.user!.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    await this.auditService.logActionFromRequest(
      req,
      'CREATE_SESSION',
      'admin_session',
      session.id.toString(),
    );

    return session;
  }

  /**
   * Get current session status
   */
  @Get('current')
  @UseGuards(AdminSessionGuard)
  @ApiOperation({ summary: 'Get current session status' })
  @ApiResponse({
    status: 200,
    description: 'Returns current session information.',
  })
  getCurrentSession(@Req() req: RequestWithUser) {
    return req.adminSession;
  }

  /**
   * List all active sessions for the current user
   */
  @Get()
  @UseGuards(AdminSessionGuard)
  @ApiOperation({ summary: 'List all active sessions' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of active sessions.',
  })
  async getActiveSessions(@Req() req: RequestWithUser) {
    return this.sessionService.getUserSessions(req.user!.id);
  }

  /**
   * Revoke current session (logout)
   */
  @Delete('current')
  @UseGuards(AdminSessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke current session' })
  @ApiResponse({
    status: 204,
    description: 'Session revoked successfully.',
  })
  async revokeCurrentSession(@Req() req: RequestWithUser) {
    await this.sessionService.revokeSession(req.adminSession!.token);
    await this.auditService.logActionFromRequest(
      req,
      'REVOKE_SESSION',
      'admin_session',
      req.adminSession!.id.toString(),
    );
  }

  /**
   * Revoke all other sessions (logout from other devices)
   */
  @Delete('others')
  @UseGuards(AdminSessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke all other sessions' })
  @ApiResponse({
    status: 204,
    description: 'Other sessions revoked successfully.',
  })
  async revokeOtherSessions(@Req() req: RequestWithUser) {
    await this.sessionService.revokeOtherSessions(
      req.user!.id,
      req.adminSession!.token,
    );
    await this.auditService.logActionFromRequest(
      req,
      'REVOKE_OTHER_SESSIONS',
      'admin_session',
      undefined,
      { userId: req.user!.id },
    );
  }
}
