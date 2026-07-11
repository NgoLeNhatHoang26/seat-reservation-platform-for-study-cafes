import type { DaySchedule, OperatingHours } from './auth.types';

export type { DaySchedule, OperatingHours };

export type CafeStatus =
  | 'ACTIVE'
  | 'PENDING_VERIFICATION'
  | 'REJECTED'
  | 'SUSPENDED';

export type SeatAvailabilityStatus = 'AVAILABLE' | 'BOOKED';

export const SeatType = {
  STANDARD: 'STANDARD',
  PREMIUM: 'PREMIUM',
  GROUP: 'GROUP',
} as const;

export type SeatType = (typeof SeatType)[keyof typeof SeatType];

export const SEAT_TYPE_OPTIONS: { value: SeatType; label: string }[] = [
  { value: SeatType.STANDARD, label: 'Tiêu chuẩn' },
  { value: SeatType.PREMIUM, label: 'Cao cấp' },
  { value: SeatType.GROUP, label: 'Nhóm' },
];

export function isSeatType(value: string): value is SeatType {
  return (Object.values(SeatType) as string[]).includes(value);
}

export function normalizeSeatType(value: string | undefined): SeatType {
  return value && isSeatType(value) ? value : SeatType.STANDARD;
}

export function seatTypeLabel(value: string): string {
  return SEAT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export interface CafeListItem {
  id: string;
  name: string;
  slug: string;
  city: string;
  coverImageUrl?: string | null;
  amenities: string[];
  totalSeats: number;
  availableSeatsCount?: number;
}

export interface Cafe {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  amenities: string[];
  operatingHours: OperatingHours;
  status: CafeStatus;
  totalSeats: number;
  phone?: string;
  description?: string;
  coverImageUrl?: string | null;
  galleryImages?: string[];
}

export interface CafePolicies {
  slotDurationMinutes: number;
  minAdvanceBookingMinutes: number;
  maxAdvanceBookingDays: number;
  cancellationDeadlineMinutes: number;
  maxConcurrentBookings: number;
  checkinGraceMinutes: number;
  timezone: string;
}

export interface Seat {
  id: string;
  seatNumber: string;
  seatType: SeatType;
  amenities: string[];
}

export interface Zone {
  id: string;
  name: string;
  seats: Seat[];
}

export interface SeatAvailability {
  id: string;
  seatNumber: string;
  status: SeatAvailabilityStatus;
}

export interface ZoneAvailability {
  id: string;
  name: string;
  seats: SeatAvailability[];
}

export interface AvailabilitySummary {
  total: number;
  available: number;
  booked: number;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface SeatGridSeat {
  id: string;
  seatNumber: string;
  status?: SeatAvailabilityStatus;
}

export interface SeatGridZone {
  id: string;
  name: string;
  seats: SeatGridSeat[];
}

export interface CursorPagination {
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface CafeListResponse {
  items: CafeListItem[];
  pagination: CursorPagination;
}

export interface CafeDetailResponse {
  cafe: Cafe;
  policies: CafePolicies;
}

export interface SeatLayoutResponse {
  zones: Zone[];
}

export interface SeatAvailabilityResponse {
  timeSlot: TimeSlot;
  zones: ZoneAvailability[];
  summary: AvailabilitySummary;
}

export interface OwnerSeat extends Seat {
  isActive: boolean;
  displayOrder?: number;
}

export interface OwnerZone extends Omit<Zone, 'seats'> {
  displayOrder: number;
  seats: OwnerSeat[];
}

export interface OwnerSeatLayoutResponse {
  zones: OwnerZone[];
}

export interface SeatPayload {
  id?: string;
  seatNumber: string;
  seatType: SeatType;
  amenities?: string[];
  isActive?: boolean;
}

export interface ZonePayload {
  id?: string;
  name: string;
  displayOrder: number;
  seats: SeatPayload[];
}

export interface SaveLayoutPayload {
  zones: ZonePayload[];
  force?: boolean;
}

export interface SaveLayoutSummary {
  zonesUpdated: number;
  seatsAdded: number;
  seatsDeactivated: number;
  bookingsCancelled?: number;
}

export interface SaveLayoutResponse {
  layout: OwnerSeatLayoutResponse;
  summary: SaveLayoutSummary;
}

export interface OwnerCafe extends Cafe {
  email?: string;
}

export interface UpdateCafeSettingsPayload {
  slotDurationMinutes?: number;
  minAdvanceBookingMinutes?: number;
  maxAdvanceBookingDays?: number;
  cancellationDeadlineMinutes?: number;
  maxConcurrentBookings?: number;
  checkinGraceMinutes?: number;
  timezone?: string;
}

export interface OwnerCafeDetailResponse {
  cafe: OwnerCafe;
  policies: CafePolicies;
}

export interface OwnerCafeListResponse {
  items: OwnerCafe[];
  pagination: CursorPagination;
}

export interface CreateCafePayload {
  name: string;
  address: string;
  city: string;
  operatingHours: OperatingHours;
  phone?: string;
  email?: string;
  description?: string;
  amenities?: string[];
  coverImageUrl?: string | null;
  galleryImages?: string[];
}

export type UpdateCafePayload = Partial<CreateCafePayload>;

export interface OwnerBookingItem {
  id: string;
  bookingCode?: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  createdAt: string;
  checkedInAt?: string;
  seat?: {
    id: string;
    seatNumber: string;
    seatType: string;
    zone?: { id: string; name: string };
  };
  customer?: {
    maskedEmail: string;
  };
}

export interface OwnerBookingListResponse {
  items: OwnerBookingItem[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    total?: number;
  };
  summary?: {
    total: number;
    confirmed: number;
    checkedIn: number;
    completed: number;
    cancelled: number;
  };
}

export interface GetOwnerBookingsParams {
  status?: string;
  startDate?: string;
  endDate?: string;
  seatId?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}
