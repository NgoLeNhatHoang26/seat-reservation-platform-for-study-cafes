import request from 'supertest';
import app from '../../src/app';

type LoginResult = {
  accessToken: string;
  refreshToken: string;
};

async function login(email: string, password: string): Promise<LoginResult> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });

  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return {
    accessToken: res.body.data.accessToken,
    refreshToken: res.body.data.refreshToken,
  };
}

export async function getCustomerToken(
  email = 'customer@example.com',
  password = 'Customer123!',
) {
  return login(email, password);
}

export async function getOwnerToken(
  email = 'owner@example.com',
  password = 'Owner123!',
) {
  return login(email, password);
}

export async function getAdminToken(
  email = 'admin@example.com',
  password = 'Admin123!',
) {
  return login(email, password);
}