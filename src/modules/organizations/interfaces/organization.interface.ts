import { Organization as PrismaOrganization } from '@prisma/client';

/**
 * @interface Organization
 * @description Organization entity interface extending Prisma's base organization type
 */
export interface Organization extends PrismaOrganization {
  email: string;
  name: string;
}
