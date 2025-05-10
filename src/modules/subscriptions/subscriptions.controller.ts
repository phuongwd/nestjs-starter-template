import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionService } from './services/subscription.service';
import { PlanService } from './services/plan.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { OrganizationId } from '../../shared/decorators/organization-context.decorator';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly planService: PlanService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  async createSubscription(
    @OrganizationId() organizationId: number,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionService.create(organizationId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get subscription details for an organization' })
  @ApiResponse({ status: 200, description: 'Subscription details retrieved' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  async getSubscription(@OrganizationId() organizationId: number) {
    return this.subscriptionService.findByOrganization(organizationId);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel a subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  async cancelSubscription(@OrganizationId() organizationId: number) {
    return this.subscriptionService.cancel(organizationId);
  }

  @Put('plan')
  @ApiOperation({ summary: 'Change subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan changed successfully' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  async changePlan(
    @OrganizationId() organizationId: number,
    @Body('planId', ParseIntPipe) planId: number,
  ) {
    return this.subscriptionService.changePlan(organizationId, planId);
  }

  @Put('payment-method')
  @ApiOperation({ summary: 'Update payment method' })
  @ApiResponse({
    status: 200,
    description: 'Payment method updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  async updatePaymentMethod(
    @OrganizationId() organizationId: number,
    @Body('paymentMethodId') paymentMethodId: string,
  ) {
    return this.subscriptionService.updatePaymentMethod(
      organizationId,
      paymentMethodId,
    );
  }

  // Plan management endpoints
  @Post('plans')
  @ApiOperation({ summary: 'Create a new subscription plan' })
  @ApiResponse({ status: 201, description: 'Plan created successfully' })
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.planService.create(dto);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get all subscription plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async getAllPlans() {
    return this.planService.findAll();
  }

  @Get('plans/active')
  @ApiOperation({ summary: 'Get all active subscription plans' })
  @ApiResponse({
    status: 200,
    description: 'Active plans retrieved successfully',
  })
  async getActivePlans() {
    return this.planService.findAllActive();
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get a specific subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan retrieved successfully' })
  async getPlan(@Param('id', ParseIntPipe) id: number) {
    return this.planService.findOne(id);
  }

  @Put('plans/:id')
  @ApiOperation({ summary: 'Update a subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  async updatePlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.planService.update(id, dto);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Delete a subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan deleted successfully' })
  async deletePlan(@Param('id', ParseIntPipe) id: number) {
    return this.planService.remove(id);
  }
}
