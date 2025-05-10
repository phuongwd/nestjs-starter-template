import { Organization, Prisma } from '@prisma/client';

export interface IOrganizationRepository {
  findById(id: number): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  findAll(): Promise<Organization[]>;
  create(data: Prisma.OrganizationCreateInput): Promise<Organization>;
  update(
    id: number,
    data: Prisma.OrganizationUpdateInput,
  ): Promise<Organization>;
  delete(id: number): Promise<void>;
  /**
   * Find all organizations where the user is an active member
   * @param userId The ID of the user
   * @returns Array of organizations where the user is an active member
   */
  findAllByMember(userId: number): Promise<Organization[]>;
}
