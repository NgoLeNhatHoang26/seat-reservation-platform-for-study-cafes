import { config } from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

const envCandidates = [
  path.resolve(process.cwd(), '.env.test'),
  path.resolve(process.cwd(), 'backend/.env.test'),
  path.resolve(__dirname, '../../.env.test'),
];

const envPath = envCandidates.find((candidate) => existsSync(candidate));

if (!envPath) {
  throw new Error('Cannot find .env.test for Vitest setup.');
}

config({
  path: envPath,
  override: true,
});

process.env.NODE_ENV = 'test';