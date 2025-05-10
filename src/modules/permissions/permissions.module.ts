import { Module } from '@nestjs/common';
import { PermissionService } from './services/permission.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PermissionGuard } from '../../shared/guards/permission.guard';

@Module({
  imports: [PrismaModule],
  providers: [PermissionService, PermissionGuard],
  exports: [PermissionService, PermissionGuard],
})
export class PermissionsModule {}
