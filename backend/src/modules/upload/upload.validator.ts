import { z } from 'zod';

export const createCloudinarySignatureSchema = z.object({
  folder: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9/_-]+$/),
  publicId: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9/_-]+$/)
    .optional(),
});

export type CreateCloudinarySignatureBody = z.infer<typeof createCloudinarySignatureSchema>;

export const registrationDocTypeSchema = z.enum(['business-license', 'id-card']);

export type RegistrationDocType = z.infer<typeof registrationDocTypeSchema>;

export const registrationUploadSignatureSchema = z.object({
  docType: registrationDocTypeSchema,
});

export type RegistrationUploadSignatureBody = z.infer<typeof registrationUploadSignatureSchema>;
