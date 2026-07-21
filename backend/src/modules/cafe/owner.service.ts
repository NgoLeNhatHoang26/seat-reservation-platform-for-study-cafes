import { prisma } from '../../config/prisma';
import { parsePaginationParams, buildCursorPaginationResult } from '../../common/pagination';
import * as cache from '../../common/cache';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../../common/errors';
import { BookingStatus, CafeStatus, SeatType } from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import { customAlphabet } from 'nanoid';
import * as ownerRepo from './owner.repository';
import type { ActiveFutureBooking, OwnerZoneWithSeats } from './owner.repository';
import * as bookingRepo from '../booking/booking.repository';
import * as authRepo from '../auth/auth.repository';
import * as bookingQueueProducer from '../../queues/booking-queue.producer';
import * as emailQueueProducer from '../../queues/email-queue.producer';
import { toOwnerCafeResponse, toOwnerBookingListItem } from './owner.mapper';
import * as checkinService from '../booking/checkin.service';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

type Tx = Prisma.TransactionClient;

type LayoutDiff = {
    removedZoneIds: string[];
    removedSeatIds: string[];
};

type AffectedBooking = ActiveFutureBooking;

export type CreateCafeDto = {
  name: string;
  address: string;
  city: string;
  operatingHours: Prisma.InputJsonValue;
  phone?: string;
  email?: string;
  description?: string;
  amenities?: Prisma.InputJsonValue;
  coverImageUrl?: string | null;
  galleryImages?: Prisma.InputJsonValue;
};

export type UpdateCafeDto = Partial<CreateCafeDto>;

export type UpdateCafeSettingsDto = {
  slotDurationMinutes?: number;
  minAdvanceBookingMinutes?: number;
  maxAdvanceBookingDays?: number;
  cancellationDeadlineMinutes?: number;
  maxConcurrentBookings?: number;
  checkinGraceMinutes?: number;
  timezone?: string;
};

export type UpdateSeatLayoutDto = {
    zones: Array<{
      id?: string;
      name: string;
      displayOrder: number;
      isActive?: boolean;
      seats: Array<{
        id?: string;
        seatNumber: string;
        seatType?: SeatType;
        amenities?: Prisma.InputJsonValue;
        isActive?: boolean;
      }>;
    }>;
    force?: boolean;
};

function generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 200);
    return `${base}-${nanoid()}`;
}

async function assertOwnerCafe(cafeId: string, ownerId: string) {
    const cafe = await ownerRepo.findCafeByIdAndOwner(cafeId, ownerId);
    if (cafe) return cafe;
  
    const exists = await prisma.cafe.findUnique({
      where: { id: cafeId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundError('CAFE_NOT_FOUND');
    throw new ForbiddenError('FORBIDDEN');
}

function validateLayoutDto(dto: UpdateSeatLayoutDto): void {
    if (!dto.zones?.length) {
      throw new ValidationError('VALIDATION_ERROR', 'At least one zone is required');
    }
    for (const zone of dto.zones) {
      if (!zone.seats?.length) {
        throw new ValidationError('VALIDATION_ERROR', 'Each zone must have at least one seat');
      }
      const labels = zone.seats.map((s) => s.seatNumber.trim());
      if (new Set(labels).size !== labels.length) {
        throw new ValidationError('DUPLICATE_SEAT_NUMBER', 'Duplicate seat number in zone');
      }
    }
}

function assertLayoutIdsBelongToCafe(
    currentZones: OwnerZoneWithSeats[],
    dto: UpdateSeatLayoutDto,
  ): void {
    const zoneIds = new Set(currentZones.map((z) => z.id));
    const seatIds = new Set(currentZones.flatMap((z) => z.seats.map((s) => s.id)));
  
    for (const zone of dto.zones) {
      if (zone.id && !zoneIds.has(zone.id)) {
        throw new ValidationError('VALIDATION_ERROR', 'Invalid zone id');
      }
      for (const seat of zone.seats) {
        if (seat.id && !seatIds.has(seat.id)) {
          throw new ValidationError('VALIDATION_ERROR', 'Invalid seat id');
        }
      }
    }
}

function computeLayoutDiff(
    currentZones: OwnerZoneWithSeats[],
    dto: UpdateSeatLayoutDto,
  ): LayoutDiff {
    const newZoneIds = new Set(dto.zones.filter((z) => z.id).map((z) => z.id!));
    const newSeatIds = new Set(
      dto.zones.flatMap((z) => z.seats.filter((s) => s.id).map((s) => s.id!)),
    );
    const removedZoneIds = currentZones
      .filter((z) => !newZoneIds.has(z.id))
      .map((z) => z.id);
    const removedSeatIds = currentZones
      .flatMap((z) => z.seats)
      .filter((s) => !newSeatIds.has(s.id))
      .map((s) => s.id);
    return { removedZoneIds, removedSeatIds };
}

async function cancelBookingForLayout(
    booking: AffectedBooking,
    ownerId: string,
    tx: Tx,
  ): Promise<boolean> {
    const now = new Date();
    const reason = 'OWNER_LAYOUT_CHANGE';
    const count = await bookingRepo.updateBookingStatus(
      booking.id,
      booking.status,
      {
        nextStatus: BookingStatus.CANCELLED,
        cancelledAt: now,
        cancellationReason: reason,
        updatedAt: now,
      },
      tx,
    );
    if (count === 0) return false;
    await bookingRepo.createBookingHistoryEntry(
      {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: BookingStatus.CANCELLED,
        changedById: ownerId,
        reason,
      },
      tx,
    );
    await bookingRepo.createAuditLog(
      {
        actorId: ownerId,
        action: 'BOOKING_CANCELLED',
        resourceType: 'BOOKING',
        resourceId: booking.id,
        changes: { reason, source: 'LAYOUT_UPDATE' },
      },
      tx,
    );
    return true;
}
  
export async function createCafe(ownerId: string, dto: CreateCafeDto) {
    const owner = await authRepo.findUserById(ownerId);
    if (!owner) throw new NotFoundError('USER_NOT_FOUND');
  
    const cafe = await prisma.$transaction(async (tx: Tx) => {
      const created = await ownerRepo.createCafe(
        {
          ownerId,
          name: dto.name,
          slug: generateSlug(dto.name),
          address: dto.address,
          city: dto.city,
          operatingHours: dto.operatingHours,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          description: dto.description ?? null,
          amenities: dto.amenities ?? [],
          coverImageUrl: dto.coverImageUrl ?? null,
          galleryImages: dto.galleryImages ?? [],
          status: CafeStatus.PENDING_VERIFICATION, // explicit
        },
        tx,
      );
  
      await bookingRepo.createAuditLog(
        {
          actorId: ownerId,
          action: 'CAFE_CREATED',
          resourceType: 'cafe',
          resourceId: created.id,
          changes: { name: created.name, city: created.city, status: created.status },
        },
        tx,
      );
  
      return created;
    });
  
    // Post-commit — KHÔNG invalidate cafes:list (RF-10: chưa public)
    try {
      await emailQueueProducer.enqueueAdminNewCafePendingEmail(cafe.id, owner.email);
    } catch (e) {
      console.warn('Failed to enqueue admin notification', e);
    }
  
    return { cafe: toOwnerCafeResponse(cafe) };
}

export async function updateCafe(
    cafeId: string,
    ownerId: string,
    dto: UpdateCafeDto,
  ) {
    await assertOwnerCafe(cafeId, ownerId);
  
    const updated = await prisma.$transaction(async (tx: Tx) => {
      const cafe = await ownerRepo.updateCafe(
        cafeId,
        {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.address !== undefined ? { address: dto.address } : {}),
          ...(dto.city !== undefined ? { city: dto.city } : {}),
          ...(dto.operatingHours !== undefined ? { operatingHours: dto.operatingHours } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
          ...(dto.email !== undefined ? { email: dto.email } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.amenities !== undefined ? { amenities: dto.amenities } : {}),
          ...(dto.coverImageUrl !== undefined ? { coverImageUrl: dto.coverImageUrl } : {}),
          ...(dto.galleryImages !== undefined ? { galleryImages: dto.galleryImages } : {}),
          // KHÔNG cho phép đổi status, ownerId, slug
        },
        tx,
      );
  
      await bookingRepo.createAuditLog(
        {
          actorId: ownerId,
          action: 'CAFE_UPDATED',
          resourceType: 'cafe',
          resourceId: cafeId,
          changes: dto as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
  
      return cafe;
    });
  
    // Post-commit cache invalidation (CACHE-DESIGN §7)
    try {
      await cache.deleteByPattern('cafes:list:*');
      await cache.deleteFromCache(cache.buildCafeDetailKey(cafeId));
    } catch (e) {
      console.warn('Failed to invalidate cafe cache', e);
    }
  
    return { cafe: toOwnerCafeResponse(updated) };
}

export async function getOwnerCafes(
    ownerId: string,
    query: Record<string, string | undefined>,
  ) {
    const { limit, cursor } = parsePaginationParams(query);
    const status = query.status as CafeStatus | undefined;
  
    const rows = await ownerRepo.findCafeByOwner(ownerId, { limit, cursor, status });
    const page = buildCursorPaginationResult(rows, limit);
  
    return {
      items: page.items,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    };
}

export async function getOwnerCafeById(cafeId: string, ownerId: string) {
    const cafe = await assertOwnerCafe(cafeId, ownerId);
    return { cafe: toOwnerCafeResponse(cafe) };
}

function mapOwnerSeatLayout(zones: OwnerZoneWithSeats[], includeInactive: boolean) {
  const visibleZones = includeInactive
    ? zones
    : zones
        .filter((zone) => zone.isActive)
        .map((zone) => ({
          ...zone,
          seats: zone.seats.filter((seat) => seat.isActive),
        }))
        .filter((zone) => zone.seats.length > 0);

  return {
    zones: visibleZones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      displayOrder: zone.displayOrder,
      isActive: zone.isActive,
      seats: zone.seats.map((seat) => ({
        id: seat.id,
        seatNumber: seat.seatNumber,
        seatType: seat.seatType,
        amenities: seat.amenities,
        isActive: seat.isActive,
      })),
    })),
  };
}

export async function getOwnerSeatLayout(
  cafeId: string,
  ownerId: string,
  includeInactive = false,
) {
  await assertOwnerCafe(cafeId, ownerId);
  const zones = await ownerRepo.findZonesWithSeatsForOwner(cafeId);
  return mapOwnerSeatLayout(zones, includeInactive);
}

export async function updateCafeSettings(
  cafeId: string,
  ownerId: string,
  dto: UpdateCafeSettingsDto,
) {
  await assertOwnerCafe(cafeId, ownerId);

  const updated = await prisma.$transaction(async (tx: Tx) => {
    const cafe = await ownerRepo.updateCafe(
      cafeId,
      {
        ...(dto.slotDurationMinutes !== undefined
          ? { slotDurationMinutes: dto.slotDurationMinutes }
          : {}),
        ...(dto.minAdvanceBookingMinutes !== undefined
          ? { minAdvanceBookingMinutes: dto.minAdvanceBookingMinutes }
          : {}),
        ...(dto.maxAdvanceBookingDays !== undefined
          ? { maxAdvanceBookingDays: dto.maxAdvanceBookingDays }
          : {}),
        ...(dto.cancellationDeadlineMinutes !== undefined
          ? { cancellationDeadlineMinutes: dto.cancellationDeadlineMinutes }
          : {}),
        ...(dto.maxConcurrentBookings !== undefined
          ? { maxConcurrentBookings: dto.maxConcurrentBookings }
          : {}),
        ...(dto.checkinGraceMinutes !== undefined
          ? { checkinGraceMinutes: dto.checkinGraceMinutes }
          : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
      },
      tx,
    );

    await bookingRepo.createAuditLog(
      {
        actorId: ownerId,
        action: 'CAFE_SETTINGS_UPDATED',
        resourceType: 'cafe',
        resourceId: cafeId,
        changes: dto as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return cafe;
  });

  try {
    await cache.deleteFromCache(cache.buildCafeDetailKey(cafeId));
    await cache.deleteByPattern(`availability:${cafeId}:*`);
  } catch (error) {
    console.warn('Failed to invalidate cafe settings cache', error);
  }

  const policies = {
    slotDurationMinutes: updated.slotDurationMinutes,
    minAdvanceBookingMinutes: updated.minAdvanceBookingMinutes,
    maxAdvanceBookingDays: updated.maxAdvanceBookingDays,
    cancellationDeadlineMinutes: updated.cancellationDeadlineMinutes,
    maxConcurrentBookings: updated.maxConcurrentBookings,
    checkinGraceMinutes: updated.checkinGraceMinutes,
    timezone: updated.timezone,
  };

  return { policies };
}

export async function updateSeatLayout(
    cafeId: string,
    ownerId: string,
    dto: UpdateSeatLayoutDto,
  ) {
    // 1) Ownership
    await assertOwnerCafe(cafeId, ownerId);
  
    // 2) Validate structure
    validateLayoutDto(dto);
  
    const currentZones = await ownerRepo.findZonesWithSeatsForOwner(cafeId);
    const isCreate = currentZones.length === 0;
  
    if (!isCreate) {
      assertLayoutIdsBelongToCafe(currentZones, dto);
    }
  
    // 3) Diff
    const { removedZoneIds, removedSeatIds } = isCreate
      ? { removedZoneIds: [], removedSeatIds: [] }
      : computeLayoutDiff(currentZones, dto);
  
    // 4) Conflict check (pre-TX)
    const affectedBookings = await ownerRepo.findActiveFutureBookingsForSeats(
      removedSeatIds,
    );
  
    if (affectedBookings.length > 0 && !dto.force) {
      throw new ConflictError(
        'LAYOUT_CONFLICT',
        'Cannot remove seats with active future bookings',
        {
          affectedBookings: affectedBookings.map((b) => ({
            bookingId: b.id,
            seatId: b.seatId,
            confirmationNumber: b.confirmationNumber,
            startTime: b.startTime.toISOString(),
          })),
        },
      );
    }
  
    // 5–7) Transaction
    const cancelledBookings: AffectedBooking[] = [];
  
    await prisma.$transaction(async (tx: Tx) => {
      // 6) Cancel nếu force=true
      if (dto.force) {
        for (const booking of affectedBookings) {
          const ok = await cancelBookingForLayout(booking, ownerId, tx);
          if (ok) cancelledBookings.push(booking);
        }
      }
  
      // 7a) Upsert zones + seats
      for (const zoneDto of dto.zones) {
        const zone = await ownerRepo.upsertZone(
          {
            id: zoneDto.id,
            cafeId,
            name: zoneDto.name,
            displayOrder: zoneDto.displayOrder,
            isActive: zoneDto.isActive,
          },
          tx,
        );
  
        for (const seatDto of zoneDto.seats) {
          await ownerRepo.upsertSeat(
            {
              id: seatDto.id,
              zoneId: zone.id,
              seatNumber: seatDto.seatNumber,
              seatType: seatDto.seatType,
              amenities: seatDto.amenities,
              isActive: seatDto.isActive,
            },
            tx,
          );
        }
      }
  
      // 7b) Soft-delete removed (KHÔNG hard delete)
      for (const seatId of removedSeatIds) {
        await ownerRepo.softDeleteSeat(seatId, tx);
      }
      for (const zoneId of removedZoneIds) {
        await ownerRepo.softDeleteZone(zoneId, tx);
      }
  
      // 7c) Audit
      await bookingRepo.createAuditLog(
        {
          actorId: ownerId,
          action: isCreate ? 'SEAT_LAYOUT_CREATED' : 'SEAT_LAYOUT_UPDATED',
          resourceType: 'cafe',
          resourceId: cafeId,
          changes: {
            force: dto.force ?? false,
            removedSeatIds,
            removedZoneIds,
            cancelledBookingIds: cancelledBookings.map((b) => b.id),
          },
        },
        tx,
      );
    });
  
    // Reload layout sau commit
    const layout = await ownerRepo.findZonesWithSeatsForOwner(cafeId);
    const totalSeats = layout.reduce((n: number, z: OwnerZoneWithSeats) => n + z.seats.length, 0);
  
    // 8) Post-commit cache (CACHE-DESIGN §7)
    try {
      await cache.deleteFromCache(cache.buildCafeLayoutKey(cafeId));
      await cache.deleteFromCache(cache.buildCafeDetailKey(cafeId));
      await cache.deleteByPattern(`availability:${cafeId}:*`);
    } catch (e) {
      console.warn('Failed to invalidate layout cache', e);
    }
  
    // 9) Post-commit cancellation emails (chỉ khi force=true)
    if (dto.force) {
      for (const booking of cancelledBookings) {
        try {
          await bookingQueueProducer.cancelAllLifecycleJobs(booking.id);
          await emailQueueProducer.enqueueCancellationEmail(
            booking.id,
            booking.customerId,
            'OWNER_LAYOUT_CHANGE',
          );
        } catch (e) {
          console.warn('Failed to enqueue layout cancellation email', e);
        }
      }
    }
  
    return {
      layout: { zones: layout },
      summary: {
        zonesCount: layout.length,
        seatsCount: totalSeats,
        removedSeats: removedSeatIds.length,
        removedZones: removedZoneIds.length,
        cancelledBookings: cancelledBookings.length,
      },
      isCreate, // controller dùng để trả 201 vs 200
    };
}

export async function viewCafeBookings(
  cafeId: string,
  ownerId: string,
  query: Record<string, string | undefined>,
) {
  await assertOwnerCafe(cafeId, ownerId);

  const { limit, cursor } = parsePaginationParams(query);
  const status = query.status as BookingStatus | undefined;
  const startDate = query.startDate ? new Date(query.startDate) : undefined;
  const endDate = query.endDate ? new Date(query.endDate) : undefined;

  const rows = await ownerRepo.findBookingsByCafe(cafeId, {
    limit,
    cursor,
    status,
    startDate,
    endDate,
    seatId: query.seatId,
    search: query.search,
  });

  const page = buildCursorPaginationResult(rows, limit);

  return {
    items: page.items.map(toOwnerBookingListItem),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  };
}

export async function ownerCheckIn(
  cafeId: string,
  bookingId: string,
  ownerId: string,
) {
  await assertOwnerCafe(cafeId, ownerId);
  return checkinService.checkInForOwner(cafeId, bookingId, ownerId);
}