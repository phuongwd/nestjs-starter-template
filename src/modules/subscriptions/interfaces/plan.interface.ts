import { Plan as PrismaPlan, Prisma } from '@prisma/client';

/**
 * @interface Plan
 * @description Plan entity interface extending Prisma's base plan type
 */
export interface Plan extends PrismaPlan {
  name: string;
  description: string | null;
  features: Prisma.JsonValue | null;
  price: Prisma.Decimal;
  isActive: boolean;
  interval: string;
  memberLimit: number;
}
