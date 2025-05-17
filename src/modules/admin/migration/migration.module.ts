import { Module } from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';
import { MigrationService } from '@/modules/admin/migration/services/migration.service';
import { MigrationController } from '@/modules/admin/migration/controllers/migration.controller';
import { KnexService } from '@/knex/knex.service';
import { INJECTION_TOKENS } from '../shared/constants/injection-tokens';
import { SystemRolesModule } from '@/modules/admin/system-roles/system-roles.module';

@Module({
  controllers: [MigrationController],
  imports: [SystemRolesModule, PrismaModule],
  providers: [
    MigrationService,
    {
      provide: INJECTION_TOKENS.SERVICE.KNEX,
      useClass: KnexService,
    },
  ],
  exports: [MigrationService],
})
export class AdminMigrationModule {}
