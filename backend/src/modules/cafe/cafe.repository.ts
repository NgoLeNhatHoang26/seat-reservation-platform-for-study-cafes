import { prisma } from "../../config/prisma";
import { CafeStatus } from "../../generated/prisma/enums";
import { BookingStatus } from '../../generated/prisma/enums';
type ListParams= {
    city?: string;
    limit: number;
    cursor?: string;
    sort?: string;
};

type SearchParams = ListParams & {
    amenities?: string[];   // ['wifi', 'parking']
    startTime?: Date;
    endTime?: Date;
};

export async function findManyActive(params: ListParams) {
    const orderBy =
        params.sort === 'createdAt'
            ? { createdAt: 'asc' as const }
            : { createdAt: 'desc' as const };

    return prisma.cafe.findMany({
        where: {
            status: CafeStatus.ACTIVE,
            ...(params.city ? { city: params.city } : {}),
            ...(params.cursor ? { id: { lt: params.cursor } } : {}),
        },
        orderBy: [{...orderBy}, { id: 'desc' }],
        take: params.limit + 1,
        select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            amenities: true,
        }
    })
}


export async function searchActive(params: SearchParams) {
    return prisma.cafe.findMany({
        where: {
            status: CafeStatus.ACTIVE,
            city: params.city,
            ...(params.cursor ? { id: { lt: params.cursor } } : {}),
        },
        orderBy: [{ createdAt: 'desc' },{ id: 'desc' }],
        take: params.limit + 1,
        select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            amenities: true,
        }
    })
}

export async function findById(cafeId: string) {
    return prisma.cafe.findUnique({ where: { id: cafeId } });
}

export async function findZonesWithSeats(cafeId: string) {
  return prisma.zone.findMany({
    where: {
      cafeId,
      deletedAt: null,
      isActive: true,
    },
    orderBy: { displayOrder: 'asc' },
    include: {
      seats: {
        where: {
          deletedAt: null,
          isActive: true,
        },
        orderBy: { seatNumber: 'asc' },
        select: {
          id: true,
          seatNumber: true,
          seatType: true,
          amenities: true,
        },
      },
    },
  });
}

export async function countTotalSeats(cafeId: string): Promise<number> {
  return prisma.seat.count({
    where: {
      deletedAt: null,
      isActive: true,
      zone: { cafeId, deletedAt: null, isActive: true },
    },
  });
}


export async function findOverlappingBookings(
  cafeId: string,
  startTime: Date,
  endTime: Date,
  zoneId?: string,
) {
  return prisma.booking.findMany({
    where: {
      cafeId,
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      ...(zoneId ? { seat: { zoneId } } : {}),
    },
    select: { seatId: true },
  });
}