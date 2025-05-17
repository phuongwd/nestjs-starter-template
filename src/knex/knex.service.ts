import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Knex, knex } from 'knex';

import { omit } from 'lodash';

export type Iknex = Knex;

@Injectable()
export class KnexService implements OnModuleDestroy {
  private knexConnection!: Iknex;

  constructor(configService: ConfigService) {
    const pgConnectionString = configService.get<string>('DATABASE_URL') || '';
    const options = {
      client: 'pg',
      connection: pgConnectionString,
      pool: { min: 4, max: 5 },
    };
    if (!this.knexConnection) {
      this.knexConnection = knex(options);
    }
    console.info({
      messages: 'Knex started',
      knexOptions: omit(options, 'connection'),
    });
  }

  getKnex(): Iknex {
    return this.knexConnection;
  }

  destroy(): Promise<void> {
    return this.knexConnection.destroy();
  }

  async onModuleDestroy() {
    await this.destroy();
  }
}
