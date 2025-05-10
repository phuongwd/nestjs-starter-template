import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PasswordService } from './services/password.service';
import { NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ERROR_MESSAGES } from './constants/user.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { UserWithoutPassword } from './types/user.type';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;
  let passwordService: PasswordService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedPassword123',
    firstName: 'Test',
    lastName: 'User',
    provider: null,
    providerId: null,
    picture: null,
    resetToken: null,
    resetTokenExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    systemRoles: [],
    organizationMembers: [],
  };

  const mockUserWithoutPassword: UserWithoutPassword = {
    id: mockUser.id,
    email: mockUser.email,
    firstName: mockUser.firstName,
    lastName: mockUser.lastName,
    provider: null,
    providerId: null,
    picture: null,
    createdAt: mockUser.createdAt,
    updatedAt: mockUser.updatedAt,
    systemRoles: [],
    organizationMembers: [],
  };

  const createUserDto: CreateUserDto = {
    email: 'test@example.com',
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: PasswordService,
          useValue: {
            hashPassword: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    passwordService = module.get<PasswordService>(PasswordService);
  });

  describe('findOne', () => {
    it('should return a user when id exists', async () => {
      // Arrange
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      // Act
      const result = await service.findOne(1);

      // Assert
      expect(result).toEqual(mockUserWithoutPassword);
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('resetToken');
      expect(result).not.toHaveProperty('resetTokenExpiresAt');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND(999)),
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user when email exists', async () => {
      // Arrange
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      // Act
      const result = await service.findByEmail('test@example.com');

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should return null when email does not exist', async () => {
      // Arrange
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      // Act
      const result = await service.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
      // Arrange
      const createdUser = {
        ...mockUser,
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        password: 'hashedPassword',
      };

      jest
        .spyOn(passwordService, 'hashPassword')
        .mockResolvedValue('hashedPassword');
      jest.spyOn(prisma.user, 'create').mockResolvedValue(createdUser);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(passwordService.hashPassword).toHaveBeenCalledWith(
        createUserDto.password,
      );
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: createUserDto.email,
          password: 'hashedPassword',
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
        },
      });
      expect(result).toEqual(expect.objectContaining(mockUserWithoutPassword));
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
      password: 'NewPassword123!',
    };

    it('should update and return the user', async () => {
      // Arrange
      const updatedUser = {
        ...mockUser,
        firstName: updateUserDto.firstName ?? mockUser.firstName,
        lastName: updateUserDto.lastName ?? mockUser.lastName,
        password: 'newHashedPassword',
      };

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest
        .spyOn(passwordService, 'hashPassword')
        .mockResolvedValue('newHashedPassword');
      jest.spyOn(prisma.user, 'update').mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(1, updateUserDto);

      // Assert
      expect(passwordService.hashPassword).toHaveBeenCalledWith(
        updateUserDto.password,
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          firstName: updateUserDto.firstName,
          lastName: updateUserDto.lastName,
          password: 'newHashedPassword',
        },
        include: {
          organizationMembers: true,
        },
      });
      expect(result).toEqual(
        expect.objectContaining({
          ...mockUserWithoutPassword,
          firstName: updateUserDto.firstName,
          lastName: updateUserDto.lastName,
        }),
      );
      expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundException when updating non-existent user', async () => {
      // Arrange
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(999, updateUserDto)).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND(999)),
      );
    });
  });

  describe('saveResetToken', () => {
    it('should save reset token and expiration date', async () => {
      // Arrange
      const userId = 1;
      const hashedToken = 'hashedResetToken';
      const expiresAt = new Date();
      const updatedUser = {
        ...mockUser,
        resetToken: hashedToken,
        resetTokenExpiresAt: expiresAt,
      };

      jest.spyOn(prisma.user, 'update').mockResolvedValue(updatedUser);

      // Act
      await service.saveResetToken(userId, hashedToken, expiresAt);

      // Assert
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          resetToken: hashedToken,
          resetTokenExpiresAt: expiresAt,
        },
      });
    });
  });
});
