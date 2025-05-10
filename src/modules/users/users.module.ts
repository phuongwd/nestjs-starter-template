import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PasswordService } from './services/password.service';
import { UsersController } from './controllers/users.controller';
import { PermissionsModule } from '../permissions/permissions.module';
import { CommonModule } from '@shared/common.module';

/**
 * Module for managing users
 * Provides user CRUD operations and user-related services
 *
 * Imports:
 * - PermissionsModule: For permission checking
 * - CommonModule: For shared guards and utilities
 */
@Module({
  imports: [PermissionsModule, CommonModule],
  controllers: [UsersController],
  providers: [UsersService, PasswordService],
  exports: [UsersService, PasswordService],
})
export class UsersModule {}
