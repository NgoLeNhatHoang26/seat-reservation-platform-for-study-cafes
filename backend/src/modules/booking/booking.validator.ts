import { z } from "zod";
import { BookingStatus } from '../../generated/prisma/enums';

export const listBookingsQuerySchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  upcoming: z.enum(['true', 'false']).optional(),
  cafeId: z.string().uuid().optional(),
  sort: z.enum(['-startTime', 'startTime']).optional(),
  limit: z.string().optional(),
  cursor: z.string().optional(),
});

export const createBookingSchema = z
  .object({
    cafeId: z.string().uuid(),
    seatId: z.string().uuid(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((d) => new Date(d.endTime) > new Date(d.startTime), {
    message: 'endTime must be after startTime',
    path: ['endTime'],
  })
  .refine((d) => new Date(d.startTime) > new Date(), {
    message: 'startTime must be in the future',
    path: ['startTime'],
  });

export const bookingIdParamSchema = z.object({
  bookingId: z.string().uuid(),
});

export const cancelBookingQuerySchema = z.object({
  reason: z.string().trim().max(255).optional(),
});

export const checkinBookingBodySchema = z.object({});

export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;