import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, Subscription } from '@prisma/client';
import { SubscriptionAdminNote } from '@/modules/admin/subscription/interfaces/subscription-admin-note.interface';
import { SubscriptionNoteType } from '@/modules/admin/subscription/dto/add-subscription-note.dto';

/**
 * @class SubscriptionRepository
 * @description Repository for subscription data access
 */
@Injectable()
export class SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    where?: Prisma.SubscriptionWhereInput;
    include?: Prisma.SubscriptionInclude;
    orderBy?: Prisma.SubscriptionOrderByWithRelationInput;
  }): Promise<Subscription[]> {
    return this.prisma.subscription.findMany(params);
  }

  async findByIdWithDetails(id: number): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({
      where: { id },
      include: {
        organization: true,
        plan: true,
      },
    });
  }

  async findExpiringWithin(
    days: number,
    organizationId?: number,
  ): Promise<Subscription[]> {
    const date = new Date();
    date.setDate(date.getDate() + days);

    return this.prisma.subscription.findMany({
      where: {
        currentPeriodEnd: {
          lte: date,
        },
        status: {
          in: ['ACTIVE', 'TRIAL'],
        },
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        organization: true,
        plan: true,
      },
      orderBy: {
        currentPeriodEnd: 'asc',
      },
    });
  }

  async update(
    id: number,
    data: Prisma.SubscriptionUpdateInput,
  ): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { id },
      data,
      include: {
        organization: true,
        plan: true,
      },
    });
  }

  /**
   * Create a new administrative note for a subscription
   */
  async createSubscriptionAdminNote(data: {
    subscriptionId: number;
    note: string;
    type: SubscriptionNoteType;
    createdBy: number;
  }): Promise<SubscriptionAdminNote> {
    const result = await this.prisma.subscriptionAdminNote.create({
      data,
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    return { ...result, type: result.type as SubscriptionNoteType };
  }

  /**
   * Find all administrative notes for a subscription
   */
  async findSubscriptionAdminNotes(
    subscriptionId: number,
  ): Promise<SubscriptionAdminNote[]> {
    const results = await this.prisma.subscriptionAdminNote.findMany({
      where: { subscriptionId },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return results.map((result) => ({
      ...result,
      type: result.type as SubscriptionNoteType,
    }));
  }
}
