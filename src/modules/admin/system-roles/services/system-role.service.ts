import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { CreateSystemRoleDto } from '../dto/create-system-role.dto';
import { SystemRoleRepository } from '../repositories/system-role.repository';

/**
 * Service for managing system roles
 */
@Injectable()
export class SystemRoleService {
  private readonly logger = new Logger(SystemRoleService.name);

  constructor(private readonly systemRoleRepository: SystemRoleRepository) {}

  /**
   * Create a new system role
   */
  async createRole(data: CreateSystemRoleDto): Promise<SystemRole> {
    const existingRole = await this.systemRoleRepository.findByName(data.name);
    if (existingRole) {
      throw new ConflictException(`Role with name ${data.name} already exists`);
    }

    this.logger.log(`Creating new system role: ${data.name}`);
    return this.systemRoleRepository.create(data);
  }

  /**
   * Get a system role by ID
   */
  async getRoleById(id: number): Promise<SystemRole> {
    const role = await this.systemRoleRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`System role with ID ${id} not found`);
    }
    return role;
  }

  /**
   * Get a system role by name
   */
  async getRoleByName(name: string): Promise<SystemRole> {
    const role = await this.systemRoleRepository.findByName(name);
    if (!role) {
      throw new NotFoundException(`System role with name ${name} not found`);
    }
    return role;
  }

  /**
   * Get all system roles
   */
  async getAllRoles(): Promise<SystemRole[]> {
    return this.systemRoleRepository.findAll();
  }

  /**
   * Check if a user has a specific system role
   */
  async hasSystemRole(userId: number, roleName: string): Promise<boolean> {
    return this.systemRoleRepository.hasRole(userId, roleName);
  }

  /**
   * Assign a system role to a user
   */
  async assignRoleToUser(userId: number, roleId: number): Promise<void> {
    const role = await this.getRoleById(roleId);
    this.logger.log(`Assigning role ${role.name} to user ${userId}`);
    await this.systemRoleRepository.assignToUser(userId, roleId);
  }

  /**
   * Remove a system role from a user
   */
  async removeRoleFromUser(userId: number, roleId: number): Promise<void> {
    const role = await this.getRoleById(roleId);
    this.logger.log(`Removing role ${role.name} from user ${userId}`);
    await this.systemRoleRepository.removeFromUser(userId, roleId);
  }

  /**
   * Delete a system role
   */
  async deleteRole(id: number): Promise<void> {
    const role = await this.getRoleById(id);
    this.logger.log(`Deleting system role: ${role.name}`);
    await this.systemRoleRepository.delete(id);
  }
}
