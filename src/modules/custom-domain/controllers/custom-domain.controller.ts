import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CustomDomainService } from '@modules/custom-domain/services/custom-domain.service';
import { CreateCustomDomainDto } from '@modules/custom-domain/dtos/create-custom-domain.dto';
import { CustomDomainResponseDto } from '@modules/custom-domain/dtos/custom-domain.response.dto';
import { RequirePermissions } from '@shared/decorators/require-permissions.decorator';
import { FeatureFlag } from '@shared/decorators/feature-flag.decorator';
import { FeatureFlagGuard } from '@shared/guards/feature-flag.guard';
import { CustomThrottlerGuard } from '@shared/guards/throttler.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Domains')
@ApiBearerAuth()
@Controller('organizations/:organizationId/domains')
@UseGuards(FeatureFlagGuard, CustomThrottlerGuard)
@FeatureFlag('customDomains')
@Throttle({ default: { limit: 5, ttl: 60000 } }) // Default: 5 requests per minute
export class CustomDomainController {
  constructor(private readonly service: CustomDomainService) {}

  @Post()
  @RequirePermissions({ resource: 'custom-domains', action: 'create' })
  @ApiOperation({
    summary: 'Add a new custom domain',
    description:
      'Adds a new custom domain to the specified organization. The domain will need to be verified before it becomes active.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'The ID of the organization to add the domain to',
    type: Number,
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'The domain has been successfully added.',
    type: CustomDomainResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid domain format or domain already exists',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authorized to add domains to this organization',
  })
  async addDomain(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateCustomDomainDto,
  ): Promise<CustomDomainResponseDto> {
    return this.service.addDomain(organizationId, dto);
  }

  @Get()
  @Throttle({ list: { limit: 20, ttl: 60000 } }) // 20 requests per minute for listing
  @RequirePermissions({ resource: 'custom-domains', action: 'read' })
  @ApiOperation({
    summary: 'Get all domains for an organization',
    description:
      'Retrieves all custom domains associated with the specified organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'The ID of the organization to get domains for',
    type: Number,
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'List of custom domains.',
    type: [CustomDomainResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authorized to view domains for this organization',
  })
  @ApiNotFoundResponse({
    description: 'Organization not found',
  })
  async getDomains(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ): Promise<CustomDomainResponseDto[]> {
    return this.service.getDomains(organizationId);
  }

  @Get(':id')
  @Throttle({ get: { limit: 20, ttl: 60000 } })
  @RequirePermissions({ resource: 'custom-domains', action: 'read' })
  @ApiOperation({
    summary: 'Get a custom domain by ID',
    description:
      'Retrieves detailed information about a specific custom domain.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'The ID of the organization the domain belongs to',
    type: Number,
    required: true,
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the custom domain to retrieve',
    type: Number,
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'The domain details.',
    type: CustomDomainResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authorized to view this domain',
  })
  @ApiNotFoundResponse({
    description: 'Domain not found',
  })
  async getDomain(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CustomDomainResponseDto> {
    return this.service.getDomain(id);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'custom-domains', action: 'delete' })
  @ApiOperation({
    summary: 'Delete a custom domain',
    description:
      'Removes a custom domain from the organization. This action cannot be undone.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'The ID of the organization the domain belongs to',
    type: Number,
    required: true,
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the custom domain to delete',
    type: Number,
    required: true,
  })
  @ApiResponse({
    status: 204,
    description: 'The domain has been successfully deleted.',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authorized to delete this domain',
  })
  @ApiNotFoundResponse({
    description: 'Domain not found',
  })
  async deleteDomain(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.service.deleteDomain(id);
  }

  @Post(':id/verify')
  @Throttle({ verify: { limit: 10, ttl: 60000 } }) // 10 verification attempts per minute
  @RequirePermissions({ resource: 'custom-domains', action: 'verify' })
  @ApiOperation({
    summary: 'Verify a custom domain',
    description:
      'Initiates the verification process for a custom domain. This checks DNS records and SSL certificate status.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'The ID of the organization the domain belongs to',
    type: Number,
    required: true,
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the custom domain to verify',
    type: Number,
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'The domain verification status.',
    type: CustomDomainResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Domain verification failed due to invalid DNS records or SSL configuration',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authorized to verify this domain',
  })
  @ApiNotFoundResponse({
    description: 'Domain not found',
  })
  async verifyDomain(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CustomDomainResponseDto> {
    return this.service.verifyDomain(id);
  }

  @Get(':id/verification')
  @Throttle({ details: { limit: 20, ttl: 60000 } })
  @RequirePermissions({ resource: 'custom-domains', action: 'read' })
  @ApiOperation({
    summary: 'Get domain verification details',
    description:
      'Retrieves detailed information about the domain verification status, including DNS records and SSL certificate details.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'The ID of the organization the domain belongs to',
    type: Number,
    required: true,
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the custom domain to get verification details for',
    type: Number,
    required: true,
  })
  @ApiResponse({
    status: 200,
    description:
      'The domain verification details, including DNS and SSL status.',
    type: CustomDomainResponseDto,
  })
  @ApiUnauthorizedResponse({
    description:
      'User is not authorized to view verification details for this domain',
  })
  @ApiNotFoundResponse({
    description: 'Domain not found',
  })
  async getVerificationDetails(@Param('id', ParseIntPipe) id: number) {
    return this.service.getVerificationDetails(id);
  }
}
