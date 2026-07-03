import 'dotenv/config';         
import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { redis } from './config/redis';

async function checkDatabaseConnection(): Promise<void> {
  await prisma.$connect();
  console.log('Database connected successfully');
}

async function checkRedisConnection(): Promise<void> {
  const pong = await redis.ping();
  if (pong !== 'PONG') {
    throw new Error('Redis ping failed');
  }
  console.log('Redis connected successfully');
}

async function startServer(): Promise<void> {
  try {
    await checkDatabaseConnection();
    await checkRedisConnection();

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();