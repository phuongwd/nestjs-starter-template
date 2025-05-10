import { Test, TestingModule } from '@nestjs/testing';
import { LoginAttemptService } from './login-attempt.service';
import { AUTH_CONSTANTS } from '../constants/auth.constant';

describe('LoginAttemptService', () => {
  let service: LoginAttemptService;
  const testEmail = 'test@example.com';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoginAttemptService],
    }).compile();

    service = module.get<LoginAttemptService>(LoginAttemptService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('recordFailedAttempt', () => {
    it('should record failed attempts', async () => {
      // Act
      await service.recordFailedAttempt(testEmail);
      const isLocked = await service.isAccountLocked(testEmail);

      // Assert
      expect(isLocked).toBeFalsy();
    });

    it('should lock account after maximum failed attempts', async () => {
      // Arrange
      jest.useFakeTimers();
      const attempts = AUTH_CONSTANTS.MAX_FAILED_ATTEMPTS;

      // Act
      for (let i = 0; i < attempts; i++) {
        await service.recordFailedAttempt(testEmail);
      }
      const isLocked = await service.isAccountLocked(testEmail);

      // Assert
      expect(isLocked).toBeTruthy();
    });
  });

  describe('isAccountLocked', () => {
    it('should return false for non-locked accounts', async () => {
      // Act
      const isLocked = await service.isAccountLocked(testEmail);

      // Assert
      expect(isLocked).toBeFalsy();
    });

    it('should return true for locked accounts', async () => {
      // Arrange
      jest.useFakeTimers();
      const attempts = AUTH_CONSTANTS.MAX_FAILED_ATTEMPTS;
      for (let i = 0; i < attempts; i++) {
        await service.recordFailedAttempt(testEmail);
      }

      // Act
      const isLocked = await service.isAccountLocked(testEmail);

      // Assert
      expect(isLocked).toBeTruthy();
    });

    it('should unlock account after lock duration expires', async () => {
      // Arrange
      jest.useFakeTimers();
      const attempts = AUTH_CONSTANTS.MAX_FAILED_ATTEMPTS;
      for (let i = 0; i < attempts; i++) {
        await service.recordFailedAttempt(testEmail);
      }

      // Act
      jest.advanceTimersByTime(AUTH_CONSTANTS.ACCOUNT_LOCK_DURATION + 1000);
      const isLocked = await service.isAccountLocked(testEmail);

      // Assert
      expect(isLocked).toBeFalsy();
    });
  });

  describe('resetAttempts', () => {
    it('should reset failed attempts and unlock account', async () => {
      // Arrange
      const attempts = AUTH_CONSTANTS.MAX_FAILED_ATTEMPTS;
      for (let i = 0; i < attempts; i++) {
        await service.recordFailedAttempt(testEmail);
      }

      // Act
      await service.resetAttempts(testEmail);
      const isLocked = await service.isAccountLocked(testEmail);

      // Assert
      expect(isLocked).toBeFalsy();
    });

    it('should handle reset for non-existent accounts', async () => {
      // Arrange
      const nonExistentEmail = 'nonexistent@example.com';

      // Act
      await service.resetAttempts(nonExistentEmail);
      const isLocked = await service.isAccountLocked(nonExistentEmail);

      // Assert
      expect(isLocked).toBeFalsy();
    });
  });
});
