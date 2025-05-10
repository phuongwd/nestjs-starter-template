import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'supertest';
import { JwtPayload } from '../src/modules/auth/types/jwt.types';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user and return secure tokens', () => {
      const userAgent = 'test-agent';
      const ip = '127.0.0.1';

      return supertest(app.getHttpServer())
        .post('/auth/register')
        .set('User-Agent', userAgent)
        .set('X-Forwarded-For', ip)
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201)
        .expect(async (res: Response) => {
          // Verify token structure
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('refresh_token');

          // Decode and verify access token
          const decoded = await jwtService.verifyAsync<JwtPayload>(
            res.body.access_token,
          );
          expect(decoded).toHaveProperty('sub');
          expect(decoded).toHaveProperty('jti');
          expect(decoded).toHaveProperty('iat');
          expect(decoded).toHaveProperty('exp');
          expect(decoded).toHaveProperty('fgp');
          expect(decoded).toHaveProperty('ver');

          // Verify no sensitive data in token
          expect(decoded).not.toHaveProperty('email');
          expect(decoded).not.toHaveProperty('organizationMembers');
        });
    });
  });

  describe('POST /auth/login', () => {
    it('should login and return secure tokens with fingerprint', () => {
      const userAgent = 'test-agent';
      const ip = '127.0.0.1';

      return supertest(app.getHttpServer())
        .post('/auth/login')
        .set('User-Agent', userAgent)
        .set('X-Forwarded-For', ip)
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        })
        .expect(200)
        .expect(async (res: Response) => {
          // Verify response structure
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user).toHaveProperty('email');
          expect(res.body.user).not.toHaveProperty('password');

          // Decode and verify token
          const decoded = await jwtService.verifyAsync<JwtPayload>(
            res.body.accessToken,
          );
          expect(decoded).toHaveProperty('sub');
          expect(decoded).toHaveProperty('jti');
          expect(decoded).toHaveProperty('iat');
          expect(decoded).toHaveProperty('exp');
          expect(decoded).toHaveProperty('fgp');
          expect(decoded).toHaveProperty('ver');

          // Verify no sensitive data in token
          expect(decoded).not.toHaveProperty('email');
          expect(decoded).not.toHaveProperty('organizationMembers');
        });
    });

    it('should fail with invalid fingerprint', () => {
      const firstUserAgent = 'test-agent-1';
      const secondUserAgent = 'test-agent-2';

      return supertest(app.getHttpServer())
        .post('/auth/login')
        .set('User-Agent', firstUserAgent)
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        })
        .expect(200)
        .then((loginRes) => {
          return supertest(app.getHttpServer())
            .get('/auth/profile')
            .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
            .set('User-Agent', secondUserAgent)
            .expect(401);
        });
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // First login to get tokens
      const loginResponse = await supertest(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      const refreshToken = loginResponse.body.refreshToken;

      return supertest(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res: Response) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should fail refresh with invalid fingerprint', async () => {
      const firstUserAgent = 'test-agent-1';
      const secondUserAgent = 'test-agent-2';

      // First login
      const loginRes = await supertest(app.getHttpServer())
        .post('/auth/login')
        .set('User-Agent', firstUserAgent)
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      // Try to refresh with different fingerprint
      return supertest(app.getHttpServer())
        .post('/auth/refresh')
        .set('User-Agent', secondUserAgent)
        .send({
          refresh_token: loginRes.body.refreshToken,
        })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should successfully logout user', async () => {
      // First login to get tokens
      const loginResponse = await supertest(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      const accessToken = loginResponse.body.accessToken;

      return supertest(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile with valid token and fingerprint', async () => {
      const userAgent = 'test-agent';
      const ip = '127.0.0.1';

      // First login
      const loginRes = await supertest(app.getHttpServer())
        .post('/auth/login')
        .set('User-Agent', userAgent)
        .set('X-Forwarded-For', ip)
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      // Access profile
      return supertest(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .set('User-Agent', userAgent)
        .set('X-Forwarded-For', ip)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
          expect(res.body).toHaveProperty('firstName');
          expect(res.body).toHaveProperty('lastName');
          expect(res.body).not.toHaveProperty('password');
        });
    });
  });
});
