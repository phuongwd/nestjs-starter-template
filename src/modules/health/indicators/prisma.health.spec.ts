import { Test, TestingModule } from '@nestjs/testing';
import { PrismaHealthIndicator } from './prisma.health';
import { PrismaService } from '../../../prisma/prisma.service';
import { HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

// Mock net.Socket
const mockSocket = {
  connect: jest.fn(),
  on: jest.fn(),
  end: jest.fn(),
  destroy: jest.fn(),
};

jest.mock('net', () => ({
  Socket: jest.fn().mockImplementation(() => mockSocket),
}));

describe('PrismaHealthIndicator', () => {
  let indicator: PrismaHealthIndicator;
  let prismaService: PrismaService;

  beforeEach(async () => {
    // Reset mock implementations
    mockSocket.connect.mockImplementation((_port, _host, callback) => {
      // Simulate successful connection
      if (callback) callback();
      return mockSocket;
    });
    mockSocket.on.mockImplementation((_event, _callback) => mockSocket);
    mockSocket.end.mockImplementation(() => mockSocket);
    mockSocket.destroy.mockImplementation(() => mockSocket);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaHealthIndicator,
        {
          provide: PrismaService,
          useValue: {
            $executeRaw: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockReturnValue('postgresql://user:pass@localhost:5432/db'),
          },
        },
      ],
    }).compile();

    indicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isHealthy', () => {
    it('should return healthy status when database is connected', async () => {
      // Arrange
      jest.spyOn(prismaService, '$executeRaw').mockResolvedValue(1);

      // Act
      const result = await indicator.isHealthy('database');

      // Assert
      expect(result).toEqual({
        database: {
          status: 'up',
          responseTime: expect.any(String),
        },
      });
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should throw HealthCheckError when database query fails', async () => {
      // Arrange
      jest
        .spyOn(prismaService, '$executeRaw')
        .mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(indicator.isHealthy('database')).rejects.toThrow(
        HealthCheckError,
      );
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should throw HealthCheckError when TCP connection fails', async () => {
      // Arrange
      mockSocket.connect.mockImplementation((_port, _host, _callback) => {
        mockSocket.on.mockImplementation((event, callback) => {
          if (event === 'error') {
            callback(new Error('TCP connection failed'));
          }
          return mockSocket;
        });
        return mockSocket;
      });

      // Act & Assert
      await expect(indicator.isHealthy('database')).rejects.toThrow(
        HealthCheckError,
      );
      expect(mockSocket.connect).toHaveBeenCalled();
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });
});
