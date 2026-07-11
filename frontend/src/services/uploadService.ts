import axios from 'axios';
import { axiosInstance } from './axiosInstance';

type CloudinarySignatureResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string[];
  overwrite: boolean;
  publicId?: string;
};

type CloudinaryUploadResponse = {
  secure_url: string;
  public_id: string;
};

export type UploadedImage = {
  url: string;
  publicId: string;
};

export async function uploadImageToCloudinary(params: {
  file: File;
  folder: string;
  publicId?: string;
}): Promise<UploadedImage> {
  const { data: signatureEnvelope } = await axiosInstance.post<{
    data: CloudinarySignatureResponse;
  }>('/uploads/cloudinary/signature', {
    folder: params.folder,
    publicId: params.publicId,
  });

  const signature = signatureEnvelope.data;
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('api_key', signature.apiKey);
  formData.append('timestamp', String(signature.timestamp));
  formData.append('signature', signature.signature);
  formData.append('folder', signature.folder);
  formData.append('overwrite', String(signature.overwrite));
  formData.append('allowed_formats', signature.allowedFormats.join(','));
  if (signature.publicId) {
    formData.append('public_id', signature.publicId);
  }

  const uploadUrl = `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`;
  const { data } = await axios.post<CloudinaryUploadResponse>(uploadUrl, formData);

  return {
    url: data.secure_url,
    publicId: data.public_id,
  };
}

export async function uploadRegistrationImage(params: {
  file: File;
  docType: 'business-license' | 'id-card';
}): Promise<UploadedImage> {
  const suffix = params.file.name
    .replace(/\.[^/.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

  const { data: signatureEnvelope } = await axios.post<{
    data: CloudinarySignatureResponse;
  }>('/api/v1/uploads/cloudinary/signature/registration', {
    publicId: `${params.docType}-${Date.now()}-${suffix}`,
  });

  const signature = signatureEnvelope.data;
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('api_key', signature.apiKey);
  formData.append('timestamp', String(signature.timestamp));
  formData.append('signature', signature.signature);
  formData.append('folder', signature.folder);
  formData.append('overwrite', String(signature.overwrite));
  formData.append('allowed_formats', signature.allowedFormats.join(','));
  if (signature.publicId) {
    formData.append('public_id', signature.publicId);
  }

  const uploadUrl = `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`;
  const { data } = await axios.post<CloudinaryUploadResponse>(uploadUrl, formData);

  return {
    url: data.secure_url,
    publicId: data.public_id,
  };
}
