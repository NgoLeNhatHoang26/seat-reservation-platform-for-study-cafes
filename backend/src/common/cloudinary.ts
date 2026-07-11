import { v2 as cloudinary } from 'cloudinary';
import { AppError } from './errors';
import { env } from '../config/env';

function ensureCloudinaryConfigured(): void {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new AppError(
      500,
      'CLOUDINARY_NOT_CONFIGURED',
      'Cloudinary environment variables are not configured',
    );
  }
}

export function getCloudinary() {
  ensureCloudinaryConfigured();
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

export function getCloudinaryConfig() {
  ensureCloudinaryConfigured();
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
  };
}
