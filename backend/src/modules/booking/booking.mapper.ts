import type { BookingStatus } from '../../generated/prisma/enums';
import type {
  BookingItemResponse,
  BookingResponse,
  BookingListItem,
} from './booking.dto';

type BookingRow = {
  id: string;
  confirmationNumber: string;
  customerId: string;
  cafeId: string;
  seatId: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  notes: string | null;
  checkedInAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type SeatRow = { id: string; seatNumber: string; zoneId: string };
type CafeRow = { id: string; name: string; timezone: string };

export function toBookingItemResponse(booking: BookingRow): BookingItemResponse {
  return {
    id: booking.id,
    confirmationNumber: booking.confirmationNumber,
    customerId: booking.customerId,
    cafeId: booking.cafeId,
    seatId: booking.seatId,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    status: booking.status,
    notes: booking.notes,
    checkedInAt: booking.checkedInAt?.toISOString() ?? null,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

export function toBookingResponse(
  booking: BookingRow,
  seat: SeatRow,
  cafe: CafeRow,
): BookingResponse {
  return {
    booking: toBookingItemResponse(booking),
    seat: { id: seat.id, label: seat.seatNumber, zoneId: seat.zoneId },
    cafe: { id: cafe.id, name: cafe.name, timezone: cafe.timezone },
  };
}

export function toBookingListItem(row: {
  id: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  notes: string | null;
  checkedInAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  seat: SeatRow;
  cafe: CafeRow;
}): BookingListItem {
  return {
    id: row.id,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime.toISOString(),
    status: row.status,
    notes: row.notes,
    checkedInAt: row.checkedInAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    seat: { id: row.seat.id, label: row.seat.seatNumber, zoneId: row.seat.zoneId },
    cafe: { id: row.cafe.id, name: row.cafe.name, timezone: row.cafe.timezone },
  };
}
