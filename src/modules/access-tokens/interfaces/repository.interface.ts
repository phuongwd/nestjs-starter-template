import { AccessToken } from '@prisma/client';
import { CreateAccessTokenDto } from '../dto/access-token.dto';

/**
 * Interface for AccessToken repository operations
 */
export interface IAccessTokenRepository {
  /**
   * Creates a new access token for a user
   * @param userId The user ID
   * @param dto The token creation data
   * @returns The created access token
   */
  createToken(userId: number, dto: CreateAccessTokenDto): Promise<AccessToken>;

  /**
   * Finds an access token by its token value
   * @param token The token string
   * @returns The access token or null if not found
   */
  findByToken(token: string): Promise<AccessToken | null>;

  /**
   * Finds an access token by name for a specific user
   * @param userId The user ID
   * @param name The token name
   * @returns The access token or null if not found
   */
  findByName(userId: number, name: string): Promise<AccessToken | null>;

  /**
   * Finds all access tokens for a specific user
   * @param userId The user ID
   * @returns Array of access tokens
   */
  findAllByUserId(userId: number): Promise<AccessToken[]>;

  /**
   * Deletes an access token
   * @param userId The user ID
   * @param tokenId The token ID
   */
  deleteToken(userId: number, tokenId: string): Promise<void>;

  /**
   * Validates a token for authentication
   * @param token The token value
   * @returns The access token if valid, null otherwise
   */
  validateToken(token: string): Promise<AccessToken | null>;
}
