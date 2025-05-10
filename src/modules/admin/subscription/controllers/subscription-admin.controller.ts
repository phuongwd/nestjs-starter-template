import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { SystemAdminGuard } from '@/modules/admin/system-roles/guards/system-admin.guard';
import { ISubscriptionAdminService } from '../interfaces/subscription-admin.interface';
import { SUBSCRIPTION_ADMIN_TOKENS } from '../constants/injection-tokens';
import { UpdateSubscriptionStatusDto } from '../dto/update-subscription-status.dto';
import { AddSubscriptionNoteDto } from '../dto/add-subscription-note.dto';
import { Inject } from '@nestjs/common';
import { RequirePermissions } from '@/shared/decorators/require-permissions.decorator';
import {
  RESOURCE_TYPES,
  ACTIONS,
} from '@/modules/permissions/constants/permission.constants';
import { CurrentUser } from '@/shared/decorators/user.decorator';
import { AuthUser } from '@/modules/auth/types/user.types';

/**
 * @class SubscriptionAdminController
 * @description Controller for administrative subscription management
 */
@ApiTags('Admin Subscriptions')
@ApiBearerAuth()
@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
export class SubscriptionAdminController {
  private readonly logger = new Logger(SubscriptionAdminController.name);

  constructor(
    @Inject(SUBSCRIPTION_ADMIN_TOKENS.SERVICE.SUBSCRIPTION)
    private readonly subscriptionService: ISubscriptionAdminService,
  ) {}

  @Get()
  @RequirePermissions({
    resource: RESOURCE_TYPES.SUBSCRIPTION,
    action: ACTIONS.VIEW,
  })
  @ApiOperation({ summary: 'List all subscriptions' })
  @ApiResponse({ status: 200, description: 'List of subscriptions' })
  async findAll() {
    this.logger.log('Finding all subscriptions');
    return this.subscriptionService.findAll();
  }

  @Get(':id')
  @RequirePermissions({
    resource: RESOURCE_TYPES.SUBSCRIPTION,
    action: ACTIONS.VIEW,
  })
  @ApiOperation({ summary: 'Get subscription details' })
  @ApiResponse({ status: 200, description: 'Subscription details' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Finding subscription #${id}`);
    return this.subscriptionService.findOne(id);
  }

  @Get('expiring')
  @RequirePermissions({
    resource: RESOURCE_TYPES.SUBSCRIPTION,
    action: ACTIONS.VIEW,
  })
  @ApiOperation({ summary: 'List expiring subscriptions' })
  @ApiResponse({ status: 200, description: 'List of expiring subscriptions' })
  async findExpiring() {
    this.logger.log('Finding expiring subscriptions');
    return this.subscriptionService.findExpiring();
  }

  @Patch(':id/status')
  @RequirePermissions({
    resource: RESOURCE_TYPES.SUBSCRIPTION,
    action: ACTIONS.UPDATE_STATUS,
  })
  @ApiOperation({ summary: 'Update subscription status' })
  @ApiResponse({ status: 200, description: 'Subscription status updated' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubscriptionStatusDto,
  ) {
    this.logger.log(`Updating subscription #${id} status to ${dto.status}`);
    return this.subscriptionService.updateStatus(id, dto.status, {
      method: dto.paymentMethod,
      reference: dto.paymentReference,
      lastPaymentDate: dto.lastPaymentDate
        ? new Date(dto.lastPaymentDate)
        : undefined,
      nextPaymentDate: dto.nextPaymentDate
        ? new Date(dto.nextPaymentDate)
        : undefined,
    });
  }

  @Post(':id/notes')
  @RequirePermissions({
    resource: RESOURCE_TYPES.SUBSCRIPTION,
    action: ACTIONS.ADD_NOTE,
  })
  @ApiOperation({ summary: 'Add subscription note' })
  @ApiResponse({ status: 201, description: 'Note added to subscription' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async addNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddSubscriptionNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    this.logger.log(`Adding note to subscription #${id}`);
    return this.subscriptionService.addNote(id, dto.note, dto.type, user.id);
  }
}
