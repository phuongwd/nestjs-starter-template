import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Request,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ACCESS_TOKEN_INJECTION_TOKENS } from '../constants/injection-tokens';
import { IAccessTokenService } from '../interfaces/service.interface';
import {
  CreateAccessTokenDto,
  AccessTokenResponseDto,
} from '../dto/access-token.dto';
import { Auth } from '@/shared/decorators/auth.decorator';
import { RequestWithUser } from '@/shared/types/request.types';

/**
 * Controller for managing API access tokens
 *
 * This controller provides endpoints for users to manage their API access tokens,
 * including creation, listing, and deletion.
 *
 * Security:
 * - Uses @Auth() decorator for authentication
 * - JWT token verification ensures access is restricted to authenticated users
 */
@ApiTags('Access Tokens')
@Controller('api/tokens')
@Auth() // Using the custom Auth decorator for consistent security
export class AccessTokenController {
  constructor(
    @Inject(ACCESS_TOKEN_INJECTION_TOKENS.SERVICE.ACCESS_TOKEN)
    private readonly accessTokenService: IAccessTokenService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new access token' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The token has been successfully created',
    type: AccessTokenResponseDto,
  })
  async create(
    @Request() req: RequestWithUser,
    @Body() createTokenDto: CreateAccessTokenDto,
  ): Promise<AccessTokenResponseDto> {
    return this.accessTokenService.createToken(req.user.id, createTokenDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all access tokens for the current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all access tokens for the current user',
    type: [AccessTokenResponseDto],
  })
  async findAll(
    @Request() req: RequestWithUser,
  ): Promise<AccessTokenResponseDto[]> {
    return this.accessTokenService.getTokens(req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an access token' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The token has been successfully deleted',
  })
  async remove(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.accessTokenService.deleteToken(req.user.id, id);
  }

  @Get('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Health check endpoint for the access tokens module',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The access tokens module is functioning correctly',
  })
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
