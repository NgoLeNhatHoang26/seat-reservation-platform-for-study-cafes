import { prisma } from "../../config/prisma";
import { BookingStatus } from "../../generated/prisma/enums";
import { Prisma } from "../../generated/prisma/client";

type Tx = Prisma.TransactionClient;

type FindByCustomerParams = {
    limit: number;
    cursor?: string;
    status?: BookingStatus;
    upcoming?: boolean;
    cafeId?: string;
    sort?: 'createdAt' | 'startTime';
}

export type UpdateBookingStatusData = {
    nextStatus: BookingStatus;
    checkedInAt?: Date | null;
    cancelledAt?: Date | null;
    cancellationReason?: string | null;
    updatedAt?: Date;
}

export async function findById(bookingId: string) {
    return prisma.booking.findUnique({ 
        where: { id: bookingId },
        select: {
            id: true,
            customerId: true,
            cafeId: true,
            seatId: true,
            confirmationNumber: true,
            startTime: true,
            endTime: true,
            status: true,
            notes: true,
            checkedInAt: true,
            cancelledAt: true,
            cancellationReason: true,
            createdAt: true,
            updatedAt: true,
            seat: {
                select: {
                id: true,
                seatNumber: true,
                zoneId: true,
                },
            },
            cafe: {
                select: {
                id: true,
                name: true,
                timezone: true,
                },
            },
        },
    });
}


export async function findByIdWithLock(bookingId: string, tx: Tx) {
    const row = await tx.$queryRaw<
    Array<{
        id: string;
        customer_id: string;
        cafe_id: string;
        seat_id: string;
        start_time: Date;
        end_time: Date;
        status: string;
        checked_in_at: Date | null;
        cancelled_at: Date | null;
        cancellation_reason: string | null;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
    }>
    >(
        Prisma.sql`
            SELECT
            b.id,
            b.customer_id,
            b.cafe_id,
            b.seat_id,
            b.start_time,
            b.end_time,
            b.status,
            b.checked_in_at,
            b.cancelled_at,
            b.cancellation_reason,
            b.notes,
            b.created_at,
            b.updated_at
        FROM bookings b
        WHERE b.id = ${bookingId}
        FOR UPDATE
        `
    );
    return row[0] ?? null;
} 

export async function lockSeatForUpdate(seatId: string, tx: Tx) {
    const rows = await tx.$queryRaw<
    Array<{
      id: string;
      zone_id: string;
      seat_number: string;
      is_active: boolean;
      deleted_at: Date | null;
    }>
    >(
    Prisma.sql`
      SELECT
        s.id,
        s.zone_id,
        s.seat_number,
        s.is_active,
        s.deleted_at
      FROM seats s
      WHERE s.id = ${seatId}
        AND s.deleted_at IS NULL
        AND s.is_active = true
      FOR UPDATE
    `
    );
    return rows[0] ?? null;
}

export async function findOverlappingBookings(
    seatId: string,
    startTime: Date,
    endTime: Date,
    tx: Tx
  ) {
    return tx.booking.findMany({
      where: {
        seatId,
        status: {
          in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN],
        },
        startTime: { lt: endTime }, // start_time < requestedEnd
        endTime: { gt: startTime }, // end_time > requestedStart
      },
      select: {
        id: true,
        seatId: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });
}

export async function countActiveBookingsByCustomer(
    customerId: string,
    cafeId: string
) {
    return prisma.booking.count({
        where: {
            customerId,
            cafeId,
            status: {
                in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN],
            },
        },
    })
}
export async function createBooking(
    data: Prisma.BookingUncheckedCreateInput,
    tx: Tx
) {
    return tx.booking.create({data});
}

export async function createBookingHistoryEntry(
    data: Prisma.BookingHistoryUncheckedCreateInput,
    tx: Tx
) {
    return tx.bookingHistory.create({ data });
}

export async function createAuditLog(
  data: Prisma.AuditLogUncheckedCreateInput,
  tx?: Tx,
) {
  const client = tx ?? prisma;
  return client.auditLog.create({ data });
}

export async function updateBookingStatus(
    bookingId: string,
    currentStatus: BookingStatus,
    data: UpdateBookingStatusData,
    tx: Tx
) {
    const result = await tx.booking.updateMany({
        where: {
          id: bookingId,
          status: currentStatus,
        },
        data: {
          status: data.nextStatus,
          checkedInAt: data.checkedInAt,
          cancelledAt: data.cancelledAt,
          cancellationReason: data.cancellationReason,
          updatedAt: data.updatedAt ?? new Date(),
        },
      });
      return result.count;
}

export async function findByCustomer(
  customerId: string,
  params: FindByCustomerParams
) {
  const now = new Date();
  const orderBy =
    params.sort === 'startTime'
      ? [{ startTime: 'asc' as const }, { id: 'asc' as const }]
      : [{ startTime: 'desc' as const }, { id: 'desc' as const }];
  return prisma.booking.findMany({
    where: {
      customerId,
      ...(params.cafeId ? { cafeId: params.cafeId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.upcoming
        ? {
            startTime: { gt: now },
            status: {
              in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN],
            },
          }
        : {}),
      ...(params.cursor ? { id: { lt: params.cursor } } : {}),
    },
    orderBy,
    take: params.limit + 1,
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      notes: true,
      checkedInAt: true,
      cancelledAt: true,
      createdAt: true,
      seat: {
        select: {
          id: true,
          seatNumber: true,
          zoneId: true,
        },
      },
      cafe: {
        select: {
          id: true,
          name: true,
          timezone: true,
        },
      },
    },
  });
}

export async function findCustomerOverlappingBooking(
  customerId: string,
  startTime: Date,
  endTime: Date,
) {
  return prisma.booking.findFirst({
    where: {
      customerId,
      status: {
        in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN],
      },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    select: { id: true },
  });
}