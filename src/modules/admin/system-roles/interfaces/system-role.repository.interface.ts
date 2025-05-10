import { SystemRole } from '@prisma/client';
import { CreateSystemRoleDto } from '../dto/create-system-role.dto';

/**
 * Interface for system role repository operations
 */
export interface ISystemRoleRepository {
  /**
   * Create a new system role
   */
  create(data: CreateSystemRoleDto): Promise<SystemRole>;

  /**
   * Find a system role by ID
   */
  findById(id: number): Promise<SystemRole | null>;

  /**
   * Find a system role by name
   */
  findByName(name: string): Promise<SystemRole | null>;

  /**
   * Find all system roles
   */
  findAll(): Promise<SystemRole[]>;

  /**
   * Check if a user has a specific system role
   */
  hasRole(userId: number, roleName: string): Promise<boolean>;

  /**
   * Assign a system role to a user
   */
  assignToUser(userId: number, roleId: number): Promise<void>;

  /**
   * Remove a system role from a user
   */
  removeFromUser(userId: number, roleId: number): Promise<void>;

  /**
   * Delete a system role
   */
  delete(id: number): Promise<void>;
}
