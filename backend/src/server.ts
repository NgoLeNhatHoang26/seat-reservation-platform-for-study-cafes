import 'dotenv/config';         
import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { redis } from './config/redis';

import type { Worker } from 'bullmq';
import { createBookingWorker } from './workers/booking.worker';
import { createEmailWorker } from './workers/email.worker';


let bookingWorker: Worker | null = null;
let emailWorker: Worker | null = null;

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

function startWorkers(): void {
  bookingWorker = createBookingWorker();
  emailWorker = createEmailWorker();
  console.log('BookingWorker started');
  console.log('EmailWorker started');
}


async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received — shutting down...`);

  try {
    await Promise.all([
      bookingWorker?.close(),
      emailWorker?.close(),
    ]);
    await prisma.$disconnect();
    redis.disconnect();
  } catch (error) {
    console.error('Error during shutdown:', error);
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

async function startServer(): Promise<void> {
  try {
    await checkDatabaseConnection();
    await checkRedisConnection();
    startWorkers();
    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();