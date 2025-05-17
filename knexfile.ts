import 'tsconfig-paths/register';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';

expand(config());

const localNodeEnvironments = new Set([undefined, 'test', 'development']);
const localHosts = new Set(['localhost', '127.0.0.1']);
const dbHost = process.env.DB_HOST || 'localhost'
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres?schema=public'

console.log('dbUrl', dbUrl);

if (
  localNodeEnvironments.has(process.env.NODE_ENV) &&
  process.argv.includes('--knexfile=./dist/knexfile.js') &&
  !localHosts.has(dbHost)
) {
  throw new Error('Migration blocked because dev machine detected');
}

export default {
  client: 'postgresql',
  connection: !localNodeEnvironments.has(process.env.NODE_ENV)
    ? {
        connectionString: dbUrl,
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : dbUrl,
  migrations: {
    tableName: 'knex_migrations',
    directory: './src/knexMigrations',
  },
  seeds: {
    directory: './src/knexSeeds',
  },
};
