import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu ít nhất 8 ký tự')
  .regex(/[a-zA-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ cái')
  .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số');

const optionalString = z
  .string()
  .transform((v) => (v.trim() === '' ? undefined : v.trim()))
  .optional();

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerCustomerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: passwordSchema,
  fullName: z
    .string()
    .min(2, 'Họ tên ít nhất 2 ký tự')
    .max(150, 'Họ tên không quá 150 ký tự'),
  phone: optionalString,
  preferredCity: optionalString,
});

export type RegisterCustomerFormValues = z.infer<typeof registerCustomerSchema>;

const dayScheduleSchema = z.object({
  open: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Định dạng: HH:MM'),
  close: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Định dạng: HH:MM'),
});

export const operatingHoursSchema = z.object({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: dayScheduleSchema,
});

export type OperatingHoursValues = z.infer<typeof operatingHoursSchema>;

export const registerOwnerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: passwordSchema,
  fullName: z
    .string()
    .min(2, 'Họ tên ít nhất 2 ký tự')
    .max(150, 'Họ tên không quá 150 ký tự'),
  phone: optionalString,
});

export type RegisterOwnerFormValues = z.infer<typeof registerOwnerSchema>;
