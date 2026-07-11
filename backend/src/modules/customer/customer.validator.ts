import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(150).optional(),
    phone: z.string().nullable().optional(),
    preferredCity: z.string().trim().min(1).max(100).nullable().optional(),
    emailNotifications: z.boolean().optional(),
    smsNotifications: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field is required',
  });

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
