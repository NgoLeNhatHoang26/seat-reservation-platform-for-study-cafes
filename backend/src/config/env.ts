import 'dotenv/config';

type Env = {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  SENDGRID_API_KEY: string;
  SENDGRID_FROM_EMAIL: string;
  ADMIN_NOTIFICATION_EMAIL: string;
  FRONTEND_URL: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
};

function validateEnv(): Env {
  const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const;

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    PORT: Number(process.env.PORT) || 3000,
    DATABASE_URL: process.env.DATABASE_URL!,
    REDIS_URL: process.env.REDIS_URL!,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ?? '',
    SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL ?? 'noreply@localhost',
    ADMIN_NOTIFICATION_EMAIL: process.env.ADMIN_NOTIFICATION_EMAIL ?? '',
    FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? '',
  };
}

export const env = validateEnv();