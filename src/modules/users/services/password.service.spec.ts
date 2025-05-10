import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service';
import { SALT_ROUNDS } from '../constants/user.constants';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  describe('hashPassword', () => {
    it('should use correct number of salt rounds', async () => {
      // Arrange
      const plainPassword = 'TestPassword123!';

      // Act
      const hashedPassword = await service.hashPassword(plainPassword);

      // Assert
      // bcrypt hash format: $2b$rounds$salt+hash
      // Extract rounds from hash
      const rounds = parseInt(hashedPassword.split('$')[2]);
      expect(rounds).toBe(SALT_ROUNDS);
    });

    it('should hash password and verify it', async () => {
      // Arrange
      const plainPassword = 'TestPassword123!';

      // Act
      const hashedPassword = await service.hashPassword(plainPassword);

      // Assert
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(plainPassword);
      expect(
        await service.comparePasswords(plainPassword, hashedPassword),
      ).toBe(true);
    });

    it('should return different hashes for same password', async () => {
      // Arrange
      const plainPassword = 'TestPassword123!';

      // Act
      const hash1 = await service.hashPassword(plainPassword);
      const hash2 = await service.hashPassword(plainPassword);

      // Assert
      expect(hash1).not.toBe(hash2);
      expect(await service.comparePasswords(plainPassword, hash1)).toBe(true);
      expect(await service.comparePasswords(plainPassword, hash2)).toBe(true);
    });
  });

  describe('comparePasswords', () => {
    it('should return true for matching passwords', async () => {
      // Arrange
      const plainPassword = 'TestPassword123!';
      const hashedPassword = await service.hashPassword(plainPassword);

      // Act
      const result = await service.comparePasswords(
        plainPassword,
        hashedPassword,
      );

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      // Arrange
      const plainPassword = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashedPassword = await service.hashPassword(plainPassword);

      // Act
      const result = await service.comparePasswords(
        wrongPassword,
        hashedPassword,
      );

      // Assert
      expect(result).toBe(false);
    });

    it('should handle empty passwords correctly', async () => {
      // Arrange
      const emptyPassword = '';
      const hashedEmpty = await service.hashPassword(emptyPassword);

      // Act
      const result = await service.comparePasswords(emptyPassword, hashedEmpty);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('password security', () => {
    it('should not produce same hash for different passwords', async () => {
      // Arrange
      const password1 = 'TestPassword123!';
      const password2 = 'TestPassword123@';

      // Act
      const hash1 = await service.hashPassword(password1);
      const hash2 = await service.hashPassword(password2);

      // Assert
      expect(hash1).not.toBe(hash2);
    });

    it('should not be possible to reverse hash to original password', async () => {
      // Arrange
      const plainPassword = 'TestPassword123!';

      // Act
      const hashedPassword = await service.hashPassword(plainPassword);

      // Assert
      expect(hashedPassword).not.toContain(plainPassword);
      expect(hashedPassword.length).toBeGreaterThan(plainPassword.length);
    });
  });
});
