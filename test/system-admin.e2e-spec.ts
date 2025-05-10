import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '@/app.module';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { SetupAuditAction } from '@/modules/system/setup/constants/setup.constants';

describe('System Admin (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  let jwtService: JwtService;
  let prisma: PrismaService;
  let adminAccessToken: string;
  let regularUserAccessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    httpServer = app.getHttpServer();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Clean database before running tests
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.systemRole.deleteMany();
    await prisma.setupAudit.deleteMany();
    await prisma.setupToken.deleteMany();

    await app.init();

    // Create SYSTEM_ADMIN role first
    const systemAdminRole = await prisma.systemRole.create({
      data: {
        name: 'SYSTEM_ADMIN',
        description: 'System Administrator',
        permissions: ['*'],
      },
    });

    // Create test users and get tokens
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: 'Admin@123456',
        firstName: 'Admin',
        lastName: 'User',
        systemRoles: {
          connect: {
            id: systemAdminRole.id,
          },
        },
      },
    });

    const regularUser = await prisma.user.create({
      data: {
        email: 'user@test.com',
        password: 'User@123456',
        firstName: 'Regular',
        lastName: 'User',
      },
    });

    adminAccessToken = jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
    });
    regularUserAccessToken = jwtService.sign({
      sub: regularUser.id,
      email: regularUser.email,
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.systemRole.deleteMany();
    await prisma.setupAudit.deleteMany();
    await prisma.setupToken.deleteMany();
    await app.close();
  });

  describe('GET /organizations', () => {
    it('should allow system admin to view all organizations', async () => {
      // Create test organizations with timestamp to ensure unique slugs
      const timestamp = Date.now();
      await prisma.organization.createMany({
        data: [
          { name: 'Org 1', slug: `org-1-${timestamp}` },
          { name: 'Org 2', slug: `org-2-${timestamp}` },
        ],
      });

      return supertest(httpServer)
        .get('/organizations')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);
          expect(res.body[0]).toHaveProperty('name');
          expect(res.body[0]).toHaveProperty('slug');
        });
    });

    it('should restrict regular users to their organizations', async () => {
      return supertest(httpServer)
        .get('/organizations')
        .set('Authorization', `Bearer ${regularUserAccessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(0); // User has no organizations
        });
    });
  });

  describe('System Role Management', () => {
    it('should allow system admin to create new system roles', async () => {
      const timestamp = Date.now();
      return supertest(httpServer)
        .post('/admin/system-roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: `SYSTEM_AUDITOR_${timestamp}`,
          description: 'System Auditor Role',
          permissions: ['system.audit.read', 'system.users.read'],
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe(`SYSTEM_AUDITOR_${timestamp}`);
          expect(res.body.permissions).toEqual([
            'system.audit.read',
            'system.users.read',
          ]);
        });
    });

    it('should prevent regular users from creating system roles', async () => {
      const timestamp = Date.now();
      return supertest(httpServer)
        .post('/admin/system-roles')
        .set('Authorization', `Bearer ${regularUserAccessToken}`)
        .send({
          name: `UNAUTHORIZED_ROLE_${timestamp}`,
          description: 'This should fail',
          permissions: ['*'],
        })
        .expect(403);
    });

    it('should allow system admin to assign roles to users', async () => {
      const timestamp = Date.now();
      const role = await prisma.systemRole.create({
        data: {
          name: `TEST_ROLE_${timestamp}`,
          description: 'Test Role',
          permissions: ['test.permission'],
        },
      });

      return supertest(httpServer)
        .post(`/admin/system-roles/${role.id}/users`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ userId: 2 }) // Regular user ID
        .expect(200);
    });
  });

  describe('User Management', () => {
    it('should allow system admin to view all users', async () => {
      return supertest(httpServer)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('email');
          expect(res.body[0]).not.toHaveProperty('password');
        });
    });

    it('should prevent regular users from accessing user management', async () => {
      return supertest(httpServer)
        .get('/admin/users')
        .set('Authorization', `Bearer ${regularUserAccessToken}`)
        .expect(403);
    });
  });

  describe('System Setup and Initialization', () => {
    it('should check system initialization status', async () => {
      await supertest(httpServer)
        .get('/system/status')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body).toHaveProperty('isInitialized');
          expect(res.body).toHaveProperty('setupRequired');
        });
    });

    it('should prevent unauthorized system initialization', async () => {
      await supertest(httpServer)
        .post('/system/init')
        .set('Authorization', `Bearer ${regularUserAccessToken}`)
        .expect(403);
    });

    it('should enforce rate limiting on setup endpoints', async () => {
      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 4; i++) {
        const response = await supertest(httpServer)
          .post('/setup/token')
          .send({ email: 'test@example.com' });

        if (i < 3) {
          expect(response.status).toBe(201);
        } else {
          expect(response.status).toBe(429); // Too Many Requests
        }
      }
    });

    it('should create setup token with audit trail', async () => {
      const response = await supertest(httpServer)
        .post('/setup/token')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ email: 'setup@test.com' })
        .expect(201);

      expect(response.body).toHaveProperty('token');

      // Verify audit log was created
      const auditLog = await prisma.setupAudit.findFirst({
        where: {
          action: SetupAuditAction.TOKEN_GENERATED,
          success: true,
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog?.action).toBe(SetupAuditAction.TOKEN_GENERATED);
    });

    it('should validate setup token security', async () => {
      const invalidToken = 'invalid-token';

      await supertest(httpServer)
        .post('/setup/validate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ token: invalidToken })
        .expect(401);

      // Verify failed validation was audited
      const auditLog = await prisma.setupAudit.findFirst({
        where: {
          action: SetupAuditAction.SETUP_ATTEMPTED,
          success: false,
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog?.error).toContain('Invalid token');
    });
  });

  describe('System Security', () => {
    it('should audit setup-related actions', async () => {
      await supertest(httpServer)
        .post('/setup/validate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ token: 'test-token' })
        .expect(401); // Should fail with invalid token

      // Verify audit log was created
      const auditLog = await prisma.setupAudit.findFirst({
        where: {
          action: 'VALIDATE_SETUP_TOKEN',
          success: false,
        },
      });
      expect(auditLog).toBeTruthy();
    });

    it('should require setup security token for protected setup endpoints', async () => {
      await supertest(httpServer)
        .post('/setup/complete')
        .send({
          adminEmail: 'admin@example.com',
          adminPassword: 'Admin@123456',
        })
        .expect(401); // Should fail without setup token
    });
  });
});
