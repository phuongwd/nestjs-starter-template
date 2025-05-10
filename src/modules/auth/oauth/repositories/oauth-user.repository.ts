import { Injectable, Logger } from '@nestjs/common';
import { IOAuthUserRepository } from '../interfaces/oauth-user-repository.interface';
import { OAuthUserProfile } from '../interfaces/oauth.interface';
import { User } from '@prisma/client';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';
import {
  UserCreateInput,
  UserUpdateInput,
} from '@/modules/users/types/user.type';

@Injectable()
export class OAuthUserRepository
  extends BaseRepository<User>
  implements IOAuthUserRepository
{
  protected readonly logger = new Logger(OAuthUserRepository.name);

  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'user');
  }

  protected isTenantAware(): boolean {
    return false;
  }

  /**
   * Validates if a string is a valid URL
   * @param url - URL string to validate
   * @returns true if valid URL, false otherwise
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Processes the avatar URL from OAuth profile
   * @param avatar - Avatar URL from OAuth profile
   * @returns Valid picture URL or undefined
   */
  private processAvatarUrl(avatar?: string): string | undefined {
    if (!avatar) {
      return undefined;
    }

    // Validate URL format
    if (!this.isValidUrl(avatar)) {
      this.logger.warn(`Invalid avatar URL received: ${avatar}`);
      return undefined;
    }

    // For data URLs (e.g., from Microsoft Graph API), we should store them separately
    if (avatar.startsWith('data:')) {
      this.logger.warn(
        'Received data URL for avatar, should be handled separately',
      );
      return undefined;
    }

    return avatar;
  }

  async findOrCreateUser(profile: OAuthUserProfile): Promise<User> {
    const { id, email, firstName, lastName, provider, avatar } = profile;
    const pictureUrl = this.processAvatarUrl(avatar);

    return this.executeQuery(async () => {
      // First try to find by provider and providerId
      let existingUser = await this.prisma.user.findFirst({
        where: {
          AND: [{ provider }, { providerId: id }],
        },
      });

      // If not found, try to find by email
      if (!existingUser) {
        existingUser = await this.prisma.user.findUnique({
          where: { email },
        });
      }

      if (existingUser) {
        // Update existing user with type-safe data
        const updateData: UserUpdateInput = {
          firstName,
          lastName,
          provider,
          providerId: id,
          ...(pictureUrl && { picture: pictureUrl }), // Only update picture if valid URL
        };

        return this.prisma.user.update({
          where: { id: existingUser.id },
          data: updateData,
        });
      }

      // Create new user with type-safe data
      const createData: UserCreateInput = {
        email,
        firstName,
        lastName,
        provider,
        providerId: id,
        password: '', // Empty string as we don't use password for OAuth users
        ...(pictureUrl && { picture: pictureUrl }), // Only set picture if valid URL
      };

      return this.prisma.user.create({
        data: createData,
      });
    }, 'Failed to find or create OAuth user');
  }
}
