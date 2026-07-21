import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

const registerOwnerDocumentsSchema = z.object({
  businessLicenseUrl: z.string().url(),
  idCardUrl: z.string().url(),
});

export const registerCustomerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().optional(),
  preferredCity: z.string().optional(),
});

export const registerOwnerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(1).optional(),
  documents: registerOwnerDocumentsSchema,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1),
});
