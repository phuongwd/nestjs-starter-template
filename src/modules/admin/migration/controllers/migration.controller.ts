import { RequireSystemRole } from '../../system-roles/decorators/require-system-role.decorator';

import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  MigrationCommand,
  MigrationService,
} from '@/modules/admin/migration/services/migration.service';

@ApiTags('System Migration')
@Controller('admin/migration')
@RequireSystemRole('SYSTEM_ADMIN')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post('/:command')
  @ApiBearerAuth()
  @ApiParam({
    name: 'command',
    enum: ['latest', 'rollback', 'up', 'down'],
    type: 'enum',
    format: 'string',
    description: 'The command to run knex migration',
    required: true,
  })
  @ApiOperation({
    summary: 'Run the knex migration',
  })
  @HttpCode(HttpStatus.OK)
  migrateDatabase(@Param('command') command: MigrationCommand) {
    return this.migrationService.execute(command);
  }
}
