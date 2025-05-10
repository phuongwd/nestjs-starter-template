import { CustomDomain, DomainStatus, Prisma } from '@prisma/client';

/**
 * Interface for custom domain repository operations
 * Defines the contract for domain-specific database operations
 * following the repository pattern.
 */
export interface ICustomDomainRepository {
  /**
   * Find all custom domains
   * @returns Array of all custom domains with their relationships
   * @throws DatabaseError if the operation fails
   */
  findAll(): Promise<CustomDomain[]>;

  /**
   * Find a custom domain by its ID
   * @param id - The domain ID
   * @returns The custom domain with relationships or null if not found
   * @throws DatabaseError if the operation fails
   */
  findById(id: number): Promise<CustomDomain | null>;

  /**
   * Find a custom domain by its domain name
   * @param domain - The domain name (case-insensitive)
   * @returns The custom domain with relationships or null if not found
   * @throws DatabaseError if the operation fails
   */
  findByDomain(domain: string): Promise<CustomDomain | null>;

  /**
   * Find all custom domains for an organization
   * @param organizationId - The organization ID
   * @returns Array of custom domains with relationships
   * @throws DatabaseError if the operation fails
   */
  findByOrganization(organizationId: number): Promise<CustomDomain[]>;

  /**
   * Create a new custom domain
   * @param data - The custom domain data
   * @returns The created custom domain with relationships
   * @throws DatabaseError if the operation fails
   * @throws UniqueConstraintError if the domain already exists
   */
  create(data: {
    domain: string;
    organizationId: number;
    verificationToken: string;
  }): Promise<CustomDomain>;

  /**
   * Update a custom domain's status and related data
   * @param id - The domain ID
   * @param status - The new status
   * @param verifiedAt - Optional verification timestamp
   * @param include - Additional data to update
   * @returns The updated custom domain with relationships
   * @throws DatabaseError if the operation fails
   * @throws NotFoundError if the domain doesn't exist
   */
  updateStatus(
    id: number,
    status: DomainStatus,
    verifiedAt?: Date,
    include?: {
      sslCertificate?: Prisma.SslCertificateCreateNestedOneWithoutDomainInput;
    },
  ): Promise<CustomDomain>;

  /**
   * Delete a custom domain
   * @param id - The domain ID
   * @throws DatabaseError if the operation fails
   * @throws NotFoundError if the domain doesn't exist
   */
  delete(id: number): Promise<void>;

  /**
   * Count custom domains for an organization
   * @param organizationId - The organization ID
   * @returns The number of domains
   * @throws DatabaseError if the operation fails
   */
  countByOrganization(organizationId: number): Promise<number>;
}
