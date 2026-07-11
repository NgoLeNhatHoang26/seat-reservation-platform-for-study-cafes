export type CafeListItem = {
  id: string;
  name: string;
  slug: string;
  city: string;
  coverImageUrl?: string | null;
  amenities: unknown;
  totalSeats: number;
  availableSeatsCount?: number;
};

export type CafePolicies = {
  slotDurationMinutes: number;
  minAdvanceBookingMinutes: number;
  maxAdvanceBookingDays: number;
  cancellationDeadlineMinutes: number;
  maxConcurrentBookings: number;
  checkinGraceMinutes: number;
  timezone: string;
};