import { getCloudinary, getCloudinaryConfig } from '../../common/cloudinary';
import type { CreateCloudinarySignatureBody } from './upload.validator';

export function createCloudinaryUploadSignature(body: CreateCloudinarySignatureBody) {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = {
    allowed_formats: 'jpg,jpeg,png,webp',
    folder: body.folder,
    overwrite: true,
    timestamp,
    ...(body.publicId ? { public_id: body.publicId } : {}),
  };

  const cloudinary = getCloudinary();
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    cloudinary.config().api_secret as string,
  );
  const config = getCloudinaryConfig();

  return {
    ...config,
    timestamp,
    signature,
    folder: body.folder,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    overwrite: true,
    ...(body.publicId ? { publicId: body.publicId } : {}),
  };
}
