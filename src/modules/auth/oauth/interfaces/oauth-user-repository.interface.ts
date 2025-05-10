import { User } from '@prisma/client';
import { OAuthUserProfile } from './oauth.interface';

/**
 * Repository interface for managing OAuth users
 */
export interface IOAuthUserRepository {
  /**
   * Find or create a user based on OAuth profile
   * @param profile - Standardized OAuth user profile
   * @returns Promise resolving to the found or created user
   * @throws Error if user creation/update fails
   */
  findOrCreateUser(profile: OAuthUserProfile): Promise<User>;
}
