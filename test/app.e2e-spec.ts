import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET / should return 401 if system is already set up', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(401)
      .then((response) => {
        expect(response.body).toHaveProperty('statusCode', 401);
        // Add checks for timestamp and path if they are consistent, or use expect.any(String)
        expect(response.body).toHaveProperty(
          'message',
          'System is already set up',
        );
      });
  });
});
