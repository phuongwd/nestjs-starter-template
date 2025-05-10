import {
  Controller,
  Post,
  Body,
  Ip,
  Headers,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ISetupService } from '../interfaces/setup-service.interface';
import { SetupCompletionDto } from '../dto/setup-completion.dto';
import { SETUP_TOKENS } from '../constants/setup.constants';
import { Inject } from '@nestjs/common';
import { SetupRateLimitGuard } from '../guards/setup-rate-limit.guard';
import { SetupValidationPipe } from '../pipes/setup-validation.pipe';

@ApiTags('System Setup')
@Controller('setup')
@UseGuards(SetupRateLimitGuard)
export class SetupController {
  constructor(
    @Inject(SETUP_TOKENS.SERVICE.SETUP)
    private readonly setupService: ISetupService,
  ) {}

  @Post('token')
  @ApiOperation({ summary: 'Generate setup token' })
  @ApiResponse({
    status: 201,
    description: 'Setup token generated successfully',
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiHeader({
    name: 'x-fingerprint',
    description: 'Browser fingerprint for additional security',
    required: false,
  })
  async generateToken(
    @Ip() ip: string,
    @Headers('x-fingerprint') fingerprint?: string,
  ) {
    const isRequired = await this.setupService.isSetupRequired();
    if (!isRequired) {
      throw new UnauthorizedException('System is already set up');
    }

    const token = await this.setupService.generateToken(ip, fingerprint);
    return {
      token: token.token,
      expiresAt: token.expiresAt,
    };
  }

  @Post('complete')
  @ApiOperation({ summary: 'Complete system setup' })
  @ApiResponse({
    status: 201,
    description: 'System setup completed successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid setup token' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @UsePipes(SetupValidationPipe)
  async completeSetup(@Body() setupData: SetupCompletionDto, @Ip() ip: string) {
    const isRequired = await this.setupService.isSetupRequired();
    if (!isRequired) {
      throw new UnauthorizedException('System is already set up');
    }

    await this.setupService.completeSetup(setupData, ip);
    return { message: 'System setup completed successfully' };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate setup token' })
  @ApiResponse({
    status: 200,
    description: 'Token validation result',
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @UsePipes(SetupValidationPipe)
  async validateToken(@Body('token') token: string, @Ip() ip: string) {
    const isValid = await this.setupService.validateToken(token, ip);
    return { isValid };
  }
}
