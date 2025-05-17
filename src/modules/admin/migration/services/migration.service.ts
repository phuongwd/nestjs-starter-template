/* eslint-disable @typescript-eslint/no-explicit-any */

import { KnexService } from '@/knex/knex.service';
import knexFile from '../../../../../knexfile';
import { Inject, Injectable } from '@nestjs/common';
import { INJECTION_TOKENS } from '@/modules/admin/shared/constants/injection-tokens';

export type MigrationCommand = 'latest' | 'rollback' | 'up' | 'down';

@Injectable()
export class MigrationService {
  constructor(
    @Inject(INJECTION_TOKENS.SERVICE.KNEX)
    private readonly knexService: KnexService,
  ) {}

  async execute(command: MigrationCommand): Promise<any> {
    const pathToMigrationFiles = `${__dirname}/../../../..`;

    const migrateConfig = {
      directory: `${pathToMigrationFiles}/${knexFile.migrations.directory.replace(
        './src/',
        '',
      )}`,
      tableName: knexFile.migrations.tableName,
    };

    const knex = this.knexService.getKnex();

    switch (command) {
      case 'latest': {
        return knex.migrate.latest(migrateConfig);
      }
      case 'up': {
        return knex.migrate.up(migrateConfig);
      }
      case 'down': {
        return knex.migrate.down(migrateConfig);
      }
      case 'rollback': {
        return knex.migrate.rollback(migrateConfig);
      }
      default: {
        throw new Error('Fail to execute');
      }
    }
  }
}
