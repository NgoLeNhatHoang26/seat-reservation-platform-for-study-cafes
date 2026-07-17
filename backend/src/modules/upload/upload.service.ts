import { randomUUID } from 'crypto';
import { getCloudinary, getCloudinaryConfig } from '../../common/cloudinary';
import type {
  CreateCloudinarySignatureBody,
  RegistrationDocType,
} from './upload.validator';

const OWNER_VERIFICATION_FOLDER = 'owner-verification';

type SignatureOptions = {
  overwrite?: boolean;
};

export function createCloudinaryUploadSignature(
  body: CreateCloudinarySignatureBody,
  options: SignatureOptions = {},
) {
  const overwrite = options.overwrite ?? true;
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = {
    allowed_formats: 'jpg,jpeg,png,webp',
    folder: body.folder,
    overwrite,
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
    overwrite,
    ...(body.publicId ? { publicId: body.publicId } : {}),
  };
}

export function createRegistrationCloudinaryUploadSignature(docType: RegistrationDocType) {
  const publicId = `${docType}-${randomUUID()}`;

  return createCloudinaryUploadSignature(
    {
      folder: OWNER_VERIFICATION_FOLDER,
      publicId,
    },
    { overwrite: false },
  );
}
