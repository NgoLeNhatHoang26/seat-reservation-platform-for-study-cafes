import { z } from 'zod';

export const bookingFormSchema = z.object({
  notes: z
    .string()
    .max(500, 'Ghi chú tối đa 500 ký tự')
    .optional()
    .or(z.literal('')),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;
