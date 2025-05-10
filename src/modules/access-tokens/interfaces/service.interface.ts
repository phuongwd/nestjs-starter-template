import {
  AccessTokenResponseDto,
  CreateAccessTokenDto,
} from '../dto/access-token.dto';

/**
 * Interface for AccessToken service operations
 */
export interface IAccessTokenService {
  /**
   * Creates a new access token for a user
   * @param userId The user ID
   * @param dto The token creation data
   * @returns The created access token response
   */
  createToken(
    userId: number | string,
    dto: CreateAccessTokenDto,
  ): Promise<AccessTokenResponseDto>;

  /**
   * Gets all access tokens for a user
   * @param userId The user ID
   * @returns Array of access token responses
   */
  getTokens(userId: number | string): Promise<AccessTokenResponseDto[]>;

  /**
   * Deletes an access token
   * @param userId The user ID
   * @param tokenId The token ID
   */
  deleteToken(userId: number | string, tokenId: string): Promise<void>;

  /**
   * Validates a token for authentication
   * @param token The token value
   * @param requiredScopes Optional array of required scopes
   * @returns The user ID associated with the token if valid
   */
  validateToken(token: string, requiredScopes?: string[]): Promise<string>;
}
