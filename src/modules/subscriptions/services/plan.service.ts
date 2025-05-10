import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { Plan } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new subscription plan
   */
  async create(dto: CreatePlanDto): Promise<Plan> {
    try {
      return await this.prisma.plan.create({
        data: {
          name: dto.name,
          description: dto.description,
          price: dto.price,
          interval: dto.interval,
          memberLimit: dto.memberLimit,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Plan with this name already exists');
      }
      throw error;
    }
  }

  /**
   * Get all subscription plans
   */
  async findAll(): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      orderBy: {
        price: 'asc',
      },
    });
  }

  /**
   * Get a specific subscription plan by ID
   */
  async findOne(id: number): Promise<Plan> {
    return this.prisma.plan.findUniqueOrThrow({
      where: { id },
    });
  }

  /**
   * Update a subscription plan
   */
  async update(id: number, dto: UpdatePlanDto): Promise<Plan> {
    try {
      return await this.prisma.plan.update({
        where: { id },
        data: {
          ...dto,
          features: dto.features
            ? (dto.features as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Plan with this name already exists');
      }
      throw error;
    }
  }

  /**
   * Delete a subscription plan
   */
  async remove(id: number): Promise<Plan> {
    return this.prisma.plan.delete({
      where: { id },
    });
  }

  /**
   * Get all active plans
   */
  async findAllActive(): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  /**
   * Compare features between plans
   */
}
