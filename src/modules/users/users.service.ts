import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PasswordService } from './services/password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserWithHashedPassword, UserWithoutPassword } from './types/user.type';
import { ERROR_MESSAGES } from './constants/user.constants';
import { Prisma, User, SystemRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { MemberService } from '@/modules/organizations/services/member.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly memberService: MemberService,
  ) {}

  /**
   * WARNING: Password hashing should only occur here during user creation/update.
   * Never hash passwords in other services.
   */

  /**
   * Find a user by their ID with their organization memberships and system roles
   */
  async findOne(id: number): Promise<UserWithoutPassword> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        organizationMembers: true,
        systemRoles: true,
      },
    });

    if (!user) {
      this.logger.warn(`User lookup failed for id: ${id}`);
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND(id));
    }

    return this.excludePassword(user);
  }

  /**
   * Find a user by their email address with their organization memberships and system roles
   */
  async findByEmail(email: string): Promise<UserWithHashedPassword | null> {
    this.logger.debug(`Attempting to find user by email: ${email}`);
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organizationMembers: {
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        systemRoles: true,
      },
    });

    if (!user) {
      this.logger.debug(`No user found with email: ${email}`);
    }

    return user;
  }

  /**
   * Create a new user and optionally add them to an organization
   */
  async create(createUserDto: CreateUserDto): Promise<UserWithoutPassword> {
    try {
      // Check if user with email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: createUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      const hashedPassword = await this.passwordService.hashPassword(
        createUserDto.password,
      );

      const user = await this.prisma.user.create({
        data: {
          email: createUserDto.email,
          password: hashedPassword,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          organizationMembers: createUserDto.organizationId
            ? {
                create: {
                  organizationId: parseInt(createUserDto.organizationId, 10),
                  status: 'ACTIVE',
                  email: createUserDto.email,
                },
              }
            : undefined,
        },
        include: {
          organizationMembers: true,
          systemRoles: true,
        },
      });

      if (createUserDto.invitationToken) {
        // If an invitation token is provided, add the user to the organization
        // Not through error handling, but as a separate process
        // This is to ensure that the user is created successfully event if the invitation process fails
        this.memberService
          .userRegisteredAcceptInvitation(
            createUserDto.invitationToken,
            user.id,
            user.email,
          )
          .catch((error) => {
            this.logger.error(
              `Error accepting invitation for user ${user.id}: ${error}`,
            );
          });
      }

      this.logger.log(`Created new user with id: ${user.id}`);
      return this.excludePassword(user);
    } catch (error) {
      this.logger.error(
        `Error creating user: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  /**
   * Update an existing user's information
   */
  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UserWithoutPassword> {
    await this.findOne(id);

    const data: Prisma.UserUpdateInput = {};

    if (updateUserDto.password) {
      data.password = await this.passwordService.hashPassword(
        updateUserDto.password,
      );
    }

    Object.assign(data, {
      ...(updateUserDto.email && { email: updateUserDto.email }),
      ...(updateUserDto.firstName && { firstName: updateUserDto.firstName }),
      ...(updateUserDto.lastName && { lastName: updateUserDto.lastName }),
    });

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      include: {
        organizationMembers: true,
        systemRoles: true,
      },
    });

    this.logger.log(`Updated user with id: ${id}`);
    return this.excludePassword(updatedUser);
  }

  /**
   * Delete a user by their ID
   * This will also delete all associated data due to cascade delete in Prisma schema
   */
  async delete(id: number): Promise<void> {
    await this.findOne(id); // Verify user exists

    try {
      await this.prisma.user.delete({
        where: { id },
      });
      this.logger.log(`Deleted user with id: ${id}`);
    } catch (error) {
      this.logger.error(
        `Error deleting user: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  /**
   * Save password reset token for a user
   */
  async saveResetToken(
    userId: number,
    hashedToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        resetToken: hashedToken,
        resetTokenExpiresAt: expiresAt,
      },
    });
    this.logger.log(`Updated reset token for user id: ${userId}`);
  }

  /**
   * Update a user's password with verification of current password
   */
  async updatePassword(
    userId: number,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<UserWithoutPassword> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizationMembers: true,
        systemRoles: true,
      },
    });

    if (!user) {
      this.logger.warn(`User not found for password update: ${userId}`);
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND(userId));
    }

    if (!user.password) {
      this.logger.warn(`User has no password set: ${userId}`);
      throw new BadRequestException('User has no password set');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.passwordService.comparePasswords(
      updatePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      this.logger.warn(`Invalid current password for user: ${userId}`);
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Verify password confirmation matches
    if (updatePasswordDto.newPassword !== updatePasswordDto.confirmPassword) {
      this.logger.warn(`Password confirmation mismatch for user: ${userId}`);
      throw new BadRequestException(
        'New password and confirmation do not match',
      );
    }

    // Hash and update the new password
    const hashedPassword = await this.passwordService.hashPassword(
      updatePasswordDto.newPassword,
    );

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
      include: {
        organizationMembers: true,
        systemRoles: true,
      },
    });

    this.logger.log(`Updated password for user: ${userId}`);
    return this.excludePassword(updatedUser);
  }

  private excludePassword(
    user: User & { systemRoles?: SystemRole[] },
  ): UserWithoutPassword & { systemRoles: SystemRole[] } {
    const {
      password: _password,
      resetToken: _resetToken,
      resetTokenExpiresAt: _resetTokenExpiresAt,
      ...userWithoutPassword
    } = user;
    return {
      ...userWithoutPassword,
      systemRoles: user.systemRoles || [],
    };
  }
}
