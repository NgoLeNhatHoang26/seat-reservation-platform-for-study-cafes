import { prisma } from '../../config/prisma';
import { BookingStatus, CafeStatus } from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';

type Tx = Prisma.TransactionClient;

export type OwnerZoneWithSeats = Prisma.ZoneGetPayload<{
  include: {
    seats: {
      select: {
        id: true;
        seatNumber: true;
        seatType: true;
        amenities: true;
        isActive: true;
      };
    };
  };
}>;

export type OwnerBookingListRow = Prisma.BookingGetPayload<{
  select: {
    id: true;
    confirmationNumber: true;
    startTime: true;
    endTime: true;
    status: true;
    notes: true;
    checkedInAt: true;
    cancelledAt: true;
    createdAt: true;
    customer: {
      select: { id: true; fullName: true; email: true };
    };
    seat: {
      select: { id: true; seatNumber: true; zoneId: true };
    };
  };
}>;

export type ActiveFutureBooking = Prisma.BookingGetPayload<{
  select: {
    id: true;
    seatId: true;
    customerId: true;
    startTime: true;
    endTime: true;
    status: true;
    confirmationNumber: true;
  };
}>;

type FindCafeByOwnerParams = {
    limit: number;
    cursor?: string;
    status?: CafeStatus;
}

type FindBookingsByCafeParams = {
    limit: number;
    cursor?: string;
    status?: BookingStatus;
    startDate?: Date;
    endDate?: Date;
    seatId?: string;
    search?: string;
};

export type UpsertZoneData = {
    id?: string;
    cafeId: string;
    name: string;
    displayOrder: number;
    isActive?: boolean;
  };
  
export type UpsertSeatData = {
    id?: string;
    zoneId: string;
    seatNumber: string;
    seatType?: Prisma.SeatCreateInput['seatType'];
    amenities?: Prisma.InputJsonValue;
    isActive?: boolean;
};

export async function findCafeByOwner(ownerId: string, params: FindCafeByOwnerParams) {
    return prisma.cafe.findMany({
        where: {
            ownerId,
            ...(params.status ? { status: params.status } : {}),
            ...(params.cursor ? { id: { lt: params.cursor } } : {}),

        },
        orderBy: [{createdAt: "desc"}, {id : "desc"}],
        take: params.limit+1,
        select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            status: true,
            coverImageUrl: true,
            galleryImages: true,
            createdAt: true,
        },
    });
}


export async function findCafeByIdAndOwner(cafeId: string, ownerId: string) {
    return prisma.cafe.findFirst({
        where: { id: cafeId, ownerId },
    });
}

export async function findZonesWithSeatsForOwner(
  cafeId: string,
): Promise<OwnerZoneWithSeats[]> {
    return prisma.zone.findMany({
      where: {
        cafeId,
        deletedAt: null,
        // KHÔNG filter isActive — owner thấy zone inactive
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        seats: {
          where: { deletedAt: null },
          orderBy: { seatNumber: 'asc' },
          select: {
            id: true,
            seatNumber: true,
            seatType: true,
            amenities: true,
            isActive: true,
          },
        },
      },
    });
}

export async function createCafe(
    data: Prisma.CafeUncheckedCreateInput,
    tx: Tx,
  ) {
    return tx.cafe.create({ data });
}
  
export async function updateCafe(
    cafeId: string,
    data: Prisma.CafeUpdateInput,
    tx?: Tx,
  ) {
    const client = tx ?? prisma;
    return client.cafe.update({ where: { id: cafeId }, data });
}



export async function upsertZone(zoneData: UpsertZoneData, tx: Tx) {
    if (zoneData.id) {
      return tx.zone.update({
        where: { id: zoneData.id },
        data: {
          name: zoneData.name,
          displayOrder: zoneData.displayOrder,
          ...(zoneData.isActive !== undefined ? { isActive: zoneData.isActive } : {}),
          deletedAt: null, // restore nếu zone từng bị soft-delete
        },
      });
    }
    return tx.zone.create({
      data: {
        cafeId: zoneData.cafeId,
        name: zoneData.name,
        displayOrder: zoneData.displayOrder,
        isActive: zoneData.isActive ?? true,
      },
    });
}
  
export async function upsertSeat(seatData: UpsertSeatData, tx: Tx) {
    if (seatData.id) {
      return tx.seat.update({
        where: { id: seatData.id },
        data: {
          seatNumber: seatData.seatNumber,
          ...(seatData.seatType ? { seatType: seatData.seatType } : {}),
          ...(seatData.amenities !== undefined ? { amenities: seatData.amenities } : {}),
          ...(seatData.isActive !== undefined ? { isActive: seatData.isActive } : {}),
          deletedAt: null,
        },
      });
    }
    return tx.seat.create({
      data: {
        zoneId: seatData.zoneId,
        seatNumber: seatData.seatNumber,
        seatType: seatData.seatType ?? 'STANDARD',
        amenities: seatData.amenities ?? [],
        isActive: seatData.isActive ?? true,
      },
    });
}

export async function softDeleteSeat(seatId: string, tx: Tx) {
    return tx.seat.update({
      where: { id: seatId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
  
export async function softDeleteZone(zoneId: string, tx: Tx) {
    return tx.zone.update({
      where: { id: zoneId },
      data: { deletedAt: new Date() },
    });
}


export async function findActiveFutureBookingsForSeats(
  seatIds: string[],
): Promise<ActiveFutureBooking[]> {
    if (seatIds.length === 0) return [];
  
    const now = new Date();
    return prisma.booking.findMany({
      where: {
        seatId: { in: seatIds },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        startTime: { gt: now },
      },
      select: {
        id: true,
        seatId: true,
        customerId: true,
        startTime: true,
        endTime: true,
        status: true,
        confirmationNumber: true,
      },
    });
}

export async function findBookingsByCafe(
  cafeId: string,
  params: FindBookingsByCafeParams,
): Promise<OwnerBookingListRow[]> {
  return prisma.booking.findMany({
      where: {
        cafeId,
        ...(params.status ? { status: params.status } : {}),
        ...(params.seatId ? { seatId: params.seatId } : {}),
        ...(params.startDate || params.endDate
          ? {
              startTime: {
                ...(params.startDate ? { gte: params.startDate } : {}),
                ...(params.endDate ? { lte: params.endDate } : {}),
              },
            }
          : {}),
        ...(params.search
          ? {
              OR: [
                { confirmationNumber: { contains: params.search, mode: 'insensitive' } },
                { customer: { fullName: { contains: params.search, mode: 'insensitive' } } },
              ],
            }
          : {}),
        ...(params.cursor ? { id: { lt: params.cursor } } : {}),
      },
      orderBy: [{ startTime: 'desc' }, { id: 'desc' }],
      take: params.limit + 1,
      select: {
        id: true,
        confirmationNumber: true,
        startTime: true,
        endTime: true,
        status: true,
        notes: true,
        checkedInAt: true,
        cancelledAt: true,
        createdAt: true,
        customer: {
          select: { id: true, fullName: true, email: true },
        },
        seat: {
          select: { id: true, seatNumber: true, zoneId: true },
        },
      },
    });
}