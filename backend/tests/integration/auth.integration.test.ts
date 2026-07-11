import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app';
import {
  cleanupTables,
  disconnectTestDatabase,
  setupTestDatabase,
  testPrisma,
} from '../helpers/db';

const AUTH_BASE = '/api/v1/auth';
const PASSWORD = 'Password123!';

function customerPayload(email = `customer-${Date.now()}@test.com`) {
  return {
    email,
    password: PASSWORD,
    fullName: 'Integration Customer',
    phone: '0900000001',
    preferredCity: 'Hanoi',
  };
}

async function registerCustomer(email?: string) {
  const payload = customerPayload(email);
  const response = await request(app).post(`${AUTH_BASE}/register`).send(payload);
  return { payload, response };
}

describe('Auth API integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTables();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('POST /auth/register valid payload returns 201 and tokens', async () => {
    const { payload, response } = await registerCustomer();

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        user: {
          email: payload.email,
          fullName: payload.fullName,
          role: 'CUSTOMER',
        },
        tokens: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresIn: expect.any(String),
        },
      },
    });

    const user = await testPrisma.user.findUnique({
      where: { email: payload.email },
      include: { customerProfile: true },
    });
    expect(user).toMatchObject({
      email: payload.email,
      fullName: payload.fullName,
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });
    expect(user?.emailVerifiedAt).toBeTruthy();
    expect(user?.customerProfile).toBeTruthy();
  });

  it('POST /auth/register duplicate email returns 409', async () => {
    const email = 'duplicate@test.com';
    await registerCustomer(email);

    const response = await request(app)
      .post(`${AUTH_BASE}/register`)
      .send(customerPayload(email));

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      success: false,
      error: 'EMAIL_ALREADY_REGISTERED',
    });
  });

  it('POST /auth/login valid credentials returns 200 and tokens', async () => {
    const { payload } = await registerCustomer();

    const response = await request(app)
      .post(`${AUTH_BASE}/login`)
      .send({ email: payload.email, password: payload.password });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        user: {
          email: payload.email,
          role: 'CUSTOMER',
        },
        tokens: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      },
    });
  });

  it('POST /auth/login wrong password returns 401', async () => {
    const { payload } = await registerCustomer();

    const response = await request(app)
      .post(`${AUTH_BASE}/login`)
      .send({ email: payload.email, password: 'WrongPassword123!' });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: 'AUTH_INVALID_CREDENTIALS',
    });
  });

  it('POST /auth/refresh valid refresh token returns 200 and new access token', async () => {
    const { payload } = await registerCustomer();
    const loginResponse = await request(app)
      .post(`${AUTH_BASE}/login`)
      .send({ email: payload.email, password: payload.password });
    const refreshToken = loginResponse.body.data.tokens.refreshToken as string;

    const response = await request(app)
      .post(`${AUTH_BASE}/refresh`)
      .send({ refreshToken });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        tokens: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      },
    });
    expect(response.body.data.tokens.refreshToken).not.toBe(refreshToken);
  });

  it('POST /auth/refresh revoked refresh token returns 401', async () => {
    const { payload } = await registerCustomer();
    const loginResponse = await request(app)
      .post(`${AUTH_BASE}/login`)
      .send({ email: payload.email, password: payload.password });
    const { accessToken, refreshToken } = loginResponse.body.data.tokens;

    await request(app)
      .post(`${AUTH_BASE}/logout`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(200);

    const response = await request(app)
      .post(`${AUTH_BASE}/refresh`)
      .send({ refreshToken });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: 'AUTH_REFRESH_TOKEN_INVALID',
    });
  });
});
