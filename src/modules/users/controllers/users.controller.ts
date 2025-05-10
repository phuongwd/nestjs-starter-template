import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Request,
  Put,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from '../users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserWithoutPasswordResponse } from '../types/user.type';
import { UpdatePasswordDto } from '../dto/update-password.dto';
import { RequestWithUser } from '@/shared/types/request.types';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieves the profile of the currently authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserWithoutPasswordResponse,
  })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(
    @Request() req: RequestWithUser,
  ): Promise<UserWithoutPasswordResponse> {
    const userId = req.user.id;
    const user = await this.usersService.findOne(userId);
    return new UserWithoutPasswordResponse(user);
  }

  @ApiOperation({
    summary: 'Update current user profile',
    description:
      "Updates the currently authenticated user's profile information",
  })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    type: UserWithoutPasswordResponse,
  })
  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateCurrentUser(
    @Request() req: RequestWithUser,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserWithoutPasswordResponse> {
    const userId = req.user.id;
    const user = await this.usersService.update(userId, updateUserDto);
    return new UserWithoutPasswordResponse(user);
  }

  @ApiOperation({
    summary: 'Change current user password',
    description:
      "Updates the currently authenticated user's password with verification",
  })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
    type: UserWithoutPasswordResponse,
  })
  @ApiResponse({ status: 400, description: 'Invalid password data' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  @UseGuards(JwtAuthGuard)
  @Put('me/password')
  async updateCurrentUserPassword(
    @Request() req: RequestWithUser,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): Promise<UserWithoutPasswordResponse> {
    const userId = req.user.id;
    const user = await this.usersService.updatePassword(
      userId,
      updatePasswordDto,
    );
    return new UserWithoutPasswordResponse(user);
  }

  @ApiOperation({
    summary: 'Get user by ID',
    description:
      "Retrieves a user's profile information by their unique identifier",
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserWithoutPasswordResponse,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserWithoutPasswordResponse> {
    const user = await this.usersService.findOne(id);
    return new UserWithoutPasswordResponse(user);
  }

  @ApiOperation({
    summary: 'Update user profile',
    description: "Updates a user's profile information",
  })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    type: UserWithoutPasswordResponse,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserWithoutPasswordResponse> {
    const user = await this.usersService.update(id, updateUserDto);
    return new UserWithoutPasswordResponse(user);
  }
}
