import request from 'supertest';
import { INestApplication } from '@nestjs/common';

export const createTestUser = (isSystemAdmin = false) => ({
  email: `test-${Date.now()}@example.com`,
  password: 'Password123!',
  firstName: 'Test',
  lastName: 'User',
  isSystemAdmin,
});

export const loginUser = async (app: any, user: any) => {
  const response = await request(app.getHttpServer()).post('/auth/login').send({
    email: user.email,
    password: user.password,
  });
  return response.body.access_token;
};

export async function getAuthToken(app: INestApplication): Promise<string> {
  const response = await request(app.getHttpServer()).post('/auth/login').send({
    email: 'admin@example.com',
    password: 'admin123',
  });

  return response.body.accessToken;
}
