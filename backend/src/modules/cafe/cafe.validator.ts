import { z } from 'zod';

export const listCafesQuerySchema = z.object({
  city: z.string().optional(),
  limit: z.string().optional(),
  cursor: z.string().optional(),
  sort: z.string().optional(),
});

export const searchCafesQuerySchema = z.object({
  city: z.string().min(1),                   
  amenities: z.string().optional(),         
  date: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  limit: z.string().optional(),
  cursor: z.string().optional(),
});

export const availabilityQuerySchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  zoneId: z.string().uuid().optional(),
}).refine(
  (d) => new Date(d.endTime) > new Date(d.startTime),
  { message: 'endTime must be after startTime' },
);