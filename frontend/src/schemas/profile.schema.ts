import { z } from 'zod';

export const profileFormSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Họ tên tối thiểu 2 ký tự')
    .max(150, 'Họ tên tối đa 150 ký tự')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(20, 'Số điện thoại tối đa 20 ký tự')
    .optional()
    .or(z.literal('')),
  preferredCity: z
    .string()
    .max(100, 'Tên thành phố tối đa 100 ký tự')
    .optional()
    .or(z.literal('')),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
