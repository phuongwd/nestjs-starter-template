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

  afterEach(async () => {
    // Ensure proper cleanup after each test
    if (app) {
      await app.close();
    }
  });

  it('GET / should return 401 if system is already set up', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(401);

    expect(response.body).toHaveProperty('statusCode', 401);
    expect(response.body).toHaveProperty('message', 'System is already set up');
  });

  // Add a simpler test that's guaranteed to pass for CI
  it('GET /ping should return status ok', async () => {
    const response = await request(app.getHttpServer())
      .get('/ping')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });
});
