import Redis from 'ioredis';
import { env } from '../config/env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, 
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error.message);
});

redis.on('connect', () => {
  if (env.NODE_ENV === 'development') {
    console.log('Redis connected');
  }
});