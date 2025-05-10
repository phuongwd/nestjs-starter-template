import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { URL } from 'url';
import { v4 } from 'uuid';

export class TestUtils {
  private static prisma: PrismaClient;

  static async initializeTestDatabase() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    const schema = `test_${v4()}`;
    const databaseUrl = new URL(process.env.DATABASE_URL);
    databaseUrl.searchParams.set('schema', schema);

    process.env.DATABASE_URL = databaseUrl.toString();

    // Run migrations
    execSync(`npx prisma migrate deploy`, {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl.toString(),
      },
    });

    // Create Prisma client
    this.prisma = new PrismaClient();
    await this.prisma.$connect();

    return this.prisma;
  }

  static async cleanupTestDatabase() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    const schema = new URL(process.env.DATABASE_URL).searchParams.get('schema');

    await this.prisma.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${schema}" CASCADE`,
    );

    await this.prisma.$disconnect();
  }

  static getPrismaClient() {
    return this.prisma;
  }
}
