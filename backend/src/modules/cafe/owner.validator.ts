import { z } from 'zod';
import { BookingStatus, CafeStatus, SeatType } from '../../generated/prisma/enums';

const operatingHoursSchema = z.record(
  z.string(),
  z.object({
    open: z.string(),
    close: z.string(),
  }),
);

export const createCafeSchema = z.object({
  name: z.string().trim().min(2).max(200),
  address: z.string().trim().min(1).max(500),
  city: z.string().trim().min(1).max(100),
  operatingHours: operatingHoursSchema,
  phone: z.string().trim().max(20).optional(),
  email: z.string().email().optional(),
  description: z.string().trim().max(2000).optional(),
  amenities: z.array(z.string()).optional(),
  coverImageUrl: z.string().url().max(2000).nullable().optional(),
  galleryImages: z.array(z.string().url().max(2000)).max(12).optional(),
});

export const updateCafeSchema = createCafeSchema.partial();

export const cafeIdParamSchema = z.object({
  cafeId: z.string().uuid(),
});

export const cafeBookingParamSchema = z.object({
  cafeId: z.string().uuid(),
  bookingId: z.string().uuid(),
});

const seatLayoutSeatSchema = z.object({
  id: z.string().uuid().optional(),
  seatNumber: z.string().trim().min(1).max(20),
  seatType: z.nativeEnum(SeatType).optional(),
  amenities: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const seatLayoutZoneSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  displayOrder: z.number().int().min(0),
  isActive: z.boolean().optional(),
  seats: z.array(seatLayoutSeatSchema).min(1),
});

export const updateSeatLayoutSchema = z.object({
  zones: z.array(seatLayoutZoneSchema).min(1),
  force: z.boolean().optional(),
});

export const listOwnerCafesQuerySchema = z.object({
  status: z.nativeEnum(CafeStatus).optional(),
  limit: z.string().optional(),
  cursor: z.string().optional(),
});

export const viewCafeBookingsQuerySchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  seatId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  limit: z.string().optional(),
  cursor: z.string().optional(),
});

export const ownerCheckInBodySchema = z.object({});

export const getOwnerSeatLayoutQuerySchema = z.object({
  includeInactive: z.enum(['true', 'false']).optional(),
});

export const updateCafeSettingsSchema = z
  .object({
    slotDurationMinutes: z.number().int().min(15).max(480).optional(),
    minAdvanceBookingMinutes: z.number().int().min(0).optional(),
    maxAdvanceBookingDays: z.number().int().min(1).max(365).optional(),
    cancellationDeadlineMinutes: z.number().int().min(0).optional(),
    maxConcurrentBookings: z.number().int().min(1).max(20).optional(),
    checkinGraceMinutes: z.number().int().min(0).max(60).optional(),
    timezone: z.string().trim().min(1).max(100).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one settings field is required',
  });

export type UpdateCafeSettingsBody = z.infer<typeof updateCafeSettingsSchema>;
export type GetOwnerSeatLayoutQuery = z.infer<typeof getOwnerSeatLayoutQuerySchema>;
