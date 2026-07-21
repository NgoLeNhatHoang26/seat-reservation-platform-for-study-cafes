import { prisma } from '../../config/prisma';
import * as cache from '../../common/cache';
import { buildCursorPaginationResult } from '../../common/pagination';
import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors';
import type { Prisma } from '../../generated/prisma/client';
import { CafeStatus, OwnerVerificationStatus, UserRole, UserStatus } from '../../generated/prisma/enums';
import { revokeAllUserTokens } from '../auth/jwt.service';
import * as cafeRepo from '../cafe/cafe.repository';
import * as ownerRepo from '../cafe/owner.repository';
import type { OwnerZoneWithSeats } from '../cafe/owner.repository';
import * as bookingRepo from '../booking/booking.repository';
import * as emailQueueProducer from '../../queues/email-queue.producer';
import * as repo from './admin.repository';
import type {
  AdminUserDetailRow,
  AdminUserListRow,
  AdminCafeDetailRow,
  FindPendingCafesParams,
  FindPendingOwnersParams,
  FindUsersParams,
  PendingCafeRow,
  PendingOwnerRow,
} from './admin.repository';
export type ListUsersParams = FindUsersParams;

export type ListPendingCafesParams = FindPendingCafesParams;
export type ListPendingOwnersParams = FindPendingOwnersParams;
export type AdminUserListItem = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
};

export type AdminUserDetail = {
  user: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    role: UserRole;
    status: UserStatus;
    emailVerifiedAt: Date | null;
    suspendedAt: Date | null;
    suspensionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  bookingCount?: number;
  cafeCount?: number;
};

export type PendingCafeListItem = {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  status: CafeStatus;
  createdAt: Date;
  owner: {
    id: string;
    email: string;
    fullName: string;
  };
};

export type AdminCafeResponse = {
  cafe: {
    id: string;
    name: string;
    slug: string;
    status: CafeStatus;
    approvedAt?: Date | null;
    rejectionReason?: string | null;
  };
};

export type AdminCafeDetailResponse = {
  cafe: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    address: string;
    city: string;
    phone: string | null;
    email: string | null;
    status: CafeStatus;
    coverImageUrl: string | null;
    galleryImages: unknown;
    amenities: unknown;
    operatingHours: unknown;
    approvedAt: Date | null;
    rejectionReason: string | null;
    createdAt: Date;
    owner: {
      id: string;
      email: string;
      fullName: string;
    };
  };
  policies: {
    slotDurationMinutes: number;
    minAdvanceBookingMinutes: number;
    maxAdvanceBookingDays: number;
    cancellationDeadlineMinutes: number;
    maxConcurrentBookings: number;
    checkinGraceMinutes: number;
    timezone: string;
  };
};
function toUserListItem(row: AdminUserListRow): AdminUserListItem {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    status: row.status,
    createdAt: row.createdAt,
  };
}

function toUserDetail(row: AdminUserDetailRow): AdminUserDetail {
  const { _count, ...user } = row;

  return {
    user,
    ...(row.role === UserRole.CUSTOMER ? { bookingCount: _count.bookings } : {}),
    ...(row.role === UserRole.OWNER ? { cafeCount: _count.ownedCafes } : {}),
  };
}

function toSuspendedUserResponse(row: AdminUserDetailRow) {
  return {
    user: {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      role: row.role,
      status: row.status,
      suspendedAt: row.suspendedAt,
      suspensionReason: row.suspensionReason,
    },
  };
}

export async function listUsers(params: ListUsersParams) {
  const rows = await repo.findUsers(params);
  const page = buildCursorPaginationResult(rows, params.limit);

  return {
    items: page.items.map(toUserListItem),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  };
}

export async function getUserById(userId: string): Promise<AdminUserDetail> {
  const row = await repo.findUserById(userId);
  if (!row) {
    throw new NotFoundError('USER_NOT_FOUND');
  }
  return toUserDetail(row);
}

export async function suspendUser(
  targetUserId: string,
  adminId: string,
  reason: string,
) {
  const target = await repo.findUserById(targetUserId);
  if (!target) {
    throw new NotFoundError('USER_NOT_FOUND');
  }

  if (target.role === UserRole.ADMIN) {
    throw new ForbiddenError('CANNOT_SUSPEND_ADMIN', 'Cannot suspend an admin account');
  }

  if (targetUserId === adminId) {
    throw new ForbiddenError('CANNOT_SUSPEND_SELF', 'Cannot suspend your own account');
  }

  if (target.status === UserStatus.SUSPENDED) {
    return toSuspendedUserResponse(target);
  }

  const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await repo.updateUserStatus(
      targetUserId,
      UserStatus.SUSPENDED,
      {
        suspendedAt: new Date(),
        suspensionReason: reason,
      },
      tx,
    );

    await bookingRepo.createAuditLog(
      {
        actorId: adminId,
        action: 'USER_SUSPENDED',
        resourceType: 'user',
        resourceId: targetUserId,
        changes: { reason },
      },
      tx,
    );

    return updated;
  });

  await revokeAllUserTokens(targetUserId);

  try {
    await emailQueueProducer.enqueueAccountSuspendedEmail(targetUserId, reason);
  } catch (err) {
    console.warn('[admin.service] failed to enqueue account suspended email', err);
  }

  return toSuspendedUserResponse(user);
}

export async function unsuspendUser(targetUserId: string, adminId: string) {
  const target = await repo.findUserById(targetUserId);
  if (!target) {
    throw new NotFoundError('USER_NOT_FOUND');
  }

  if (target.status === UserStatus.ACTIVE) {
    return {
      user: {
        id: target.id,
        email: target.email,
        fullName: target.fullName,
        role: target.role,
        status: target.status,
      },
    };
  }

  const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await repo.updateUserStatus(
      targetUserId,
      UserStatus.ACTIVE,
      {
        suspendedAt: null,
        suspensionReason: null,
      },
      tx,
    );

    await bookingRepo.createAuditLog(
      {
        actorId: adminId,
        action: 'USER_UNSUSPENDED',
        resourceType: 'user',
        resourceId: targetUserId,
      },
      tx,
    );

    return updated;
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
    },
  };
}

function toPendingCafeListItem(row: PendingCafeRow): PendingCafeListItem {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    address: row.address,
    city: row.city,
    phone: row.phone,
    email: row.email,
    status: row.status,
    createdAt: row.createdAt,
    owner: row.owner,
  };
}

function toCafeResponse(row: PendingCafeRow): AdminCafeResponse {
  return {
    cafe: {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      approvedAt: row.approvedAt,
      rejectionReason: row.rejectionReason,
    },
  };
}

function toAdminCafeDetail(row: AdminCafeDetailRow): AdminCafeDetailResponse {
  return {
    cafe: {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      address: row.address,
      city: row.city,
      phone: row.phone,
      email: row.email,
      status: row.status,
      coverImageUrl: row.coverImageUrl,
      galleryImages: row.galleryImages,
      amenities: row.amenities,
      operatingHours: row.operatingHours,
      approvedAt: row.approvedAt,
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt,
      owner: row.owner,
    },
    policies: {
      slotDurationMinutes: row.slotDurationMinutes,
      minAdvanceBookingMinutes: row.minAdvanceBookingMinutes,
      maxAdvanceBookingDays: row.maxAdvanceBookingDays,
      cancellationDeadlineMinutes: row.cancellationDeadlineMinutes,
      maxConcurrentBookings: row.maxConcurrentBookings,
      checkinGraceMinutes: row.checkinGraceMinutes,
      timezone: row.timezone,
    },
  };
}

function mapAdminSeatLayout(zones: OwnerZoneWithSeats[]) {
  return {
    zones: zones.map((zone) => ({
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

export async function approveCafe(
  cafeId: string,
  adminId: string,
  notes?: string,
): Promise<AdminCafeResponse> {
  const existing = await cafeRepo.findById(cafeId);
  if (!existing) {
    throw new NotFoundError('CAFE_NOT_FOUND');
  }

  if (existing.status === CafeStatus.ACTIVE) {
    const row = await repo.findCafeById(cafeId);
    if (!row) {
      throw new NotFoundError('CAFE_NOT_FOUND');
    }
    return toCafeResponse(row);
  }

  if (existing.status !== CafeStatus.PENDING_VERIFICATION) {
    throw new ConflictError(
      'CAFE_NOT_PENDING',
      `Café cannot be approved while status is ${existing.status}`,
    );
  }

  const cafe = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await repo.updateCafeStatus(
      cafeId,
      CafeStatus.ACTIVE,
      { approvedAt: new Date() },
      tx,
    );

    await bookingRepo.createAuditLog(
      {
        actorId: adminId,
        action: 'CAFE_APPROVED',
        resourceType: 'cafe',
        resourceId: cafeId,
        ...(notes ? { changes: { notes } } : {}),
      },
      tx,
    );

    return updated;
  });

  try {
    await cache.deleteByPattern('cafes:list:*');
    await cache.deleteFromCache(cache.buildCafeDetailKey(cafeId));
  } catch (err) {
    console.warn('[admin.service] failed to invalidate cafe cache after approve', err);
  }

  return toCafeResponse(cafe);
}

export async function listPendingCafes(params: ListPendingCafesParams) {
  const rows = await repo.findPendingCafes(params);
  const page = buildCursorPaginationResult(rows, params.limit);

  return {
    items: page.items.map(toPendingCafeListItem),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  };
}

export async function getCafeDetail(cafeId: string): Promise<AdminCafeDetailResponse> {
  const cafe = await repo.findCafeDetailById(cafeId);
  if (!cafe) {
    throw new NotFoundError('CAFE_NOT_FOUND');
  }
  return toAdminCafeDetail(cafe);
}

export async function getCafeSeatLayout(cafeId: string) {
  const cafe = await cafeRepo.findById(cafeId);
  if (!cafe) {
    throw new NotFoundError('CAFE_NOT_FOUND');
  }

  const zones = await ownerRepo.findZonesWithSeatsForOwner(cafeId);
  return mapAdminSeatLayout(zones);
}

export async function rejectCafe(
  cafeId: string,
  adminId: string,
  reason: string,
): Promise<AdminCafeResponse> {
  const existing = await cafeRepo.findById(cafeId);
  if (!existing) {
    throw new NotFoundError('CAFE_NOT_FOUND');
  }

  if (existing.status === CafeStatus.REJECTED) {
    const row = await repo.findCafeById(cafeId);
    if (!row) {
      throw new NotFoundError('CAFE_NOT_FOUND');
    }
    return toCafeResponse(row);
  }

  if (existing.status !== CafeStatus.PENDING_VERIFICATION) {
    throw new ConflictError(
      'CAFE_NOT_PENDING',
      `Café cannot be rejected while status is ${existing.status}`,
    );
  }

  const cafe = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await repo.updateCafeStatus(
      cafeId,
      CafeStatus.REJECTED,
      { rejectionReason: reason },
      tx,
    );

    await bookingRepo.createAuditLog(
      {
        actorId: adminId,
        action: 'CAFE_REJECTED',
        resourceType: 'cafe',
        resourceId: cafeId,
        changes: { reason },
      },
      tx,
    );

    return updated;
  });

  return toCafeResponse(cafe);
}

export type PendingOwnerListItem = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: UserStatus;
  createdAt: Date;
  profile: {
    businessLicenseUrl: string;
    idCardUrl: string;
    verificationStatus: OwnerVerificationStatus;
    createdAt: Date;
  };
};

export type AdminOwnerDetailResponse = {
  owner: PendingOwnerListItem;
};

export type AdminOwnerActionResponse = {
  owner: {
    id: string;
    email: string;
    fullName: string;
    status: UserStatus;
    profile: {
      verificationStatus: OwnerVerificationStatus;
      reviewedAt: Date | null;
      rejectionReason: string | null;
    };
  };
};

function toPendingOwnerListItem(row: PendingOwnerRow): PendingOwnerListItem {
  if (!row.ownerProfile) {
    throw new Error(`Owner ${row.id} is missing ownerProfile`);
  }

  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    status: row.status,
    createdAt: row.createdAt,
    profile: {
      businessLicenseUrl: row.ownerProfile.businessLicenseUrl,
      idCardUrl: row.ownerProfile.idCardUrl,
      verificationStatus: row.ownerProfile.verificationStatus,
      createdAt: row.ownerProfile.createdAt,
    },
  };
}

export async function listPendingOwners(params: ListPendingOwnersParams) {
  const rows = await repo.findPendingOwners(params);
  const page = buildCursorPaginationResult(rows, params.limit);

  return {
    items: page.items.map(toPendingOwnerListItem),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  };
}

export async function getOwnerDetail(userId: string): Promise<AdminOwnerDetailResponse> {
  const owner = await repo.findOwnerByUserId(userId);
  if (!owner?.ownerProfile) {
    throw new NotFoundError('USER_NOT_FOUND');
  }

  return { owner: toPendingOwnerListItem(owner) };
}

export async function approveOwner(
  userId: string,
  adminId: string,
  notes?: string,
): Promise<AdminOwnerActionResponse> {
  const existing = await repo.findPendingOwnerByUserId(userId);
  if (!existing?.ownerProfile) {
    throw new NotFoundError('USER_NOT_FOUND');
  }

  if (existing.ownerProfile.verificationStatus === OwnerVerificationStatus.APPROVED) {
    return {
      owner: {
        id: existing.id,
        email: existing.email,
        fullName: existing.fullName,
        status: existing.status,
        profile: {
          verificationStatus: existing.ownerProfile.verificationStatus,
          reviewedAt: existing.ownerProfile.reviewedAt,
          rejectionReason: existing.ownerProfile.rejectionReason,
        },
      },
    };
  }

  if (existing.ownerProfile.verificationStatus !== OwnerVerificationStatus.PENDING) {
    throw new ConflictError(
      'OWNER_NOT_PENDING',
      `Owner cannot be approved while verification status is ${existing.ownerProfile.verificationStatus}`,
    );
  }

  const owner = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await repo.updateUserStatus(userId, UserStatus.ACTIVE, {}, tx);
    const updated = await repo.updateOwnerVerification(
      userId,
      {
        verificationStatus: OwnerVerificationStatus.APPROVED,
        rejectionReason: null,
        reviewedAt: new Date(),
      },
      tx,
    );

    await bookingRepo.createAuditLog(
      {
        actorId: adminId,
        action: 'OWNER_APPROVED',
        resourceType: 'user',
        resourceId: userId,
        ...(notes ? { changes: { notes } } : {}),
      },
      tx,
    );

    return updated;
  });

  if (!owner.ownerProfile) {
    throw new NotFoundError('USER_NOT_FOUND');
  }

  return {
    owner: {
      id: owner.id,
      email: owner.email,
      fullName: owner.fullName,
      status: UserStatus.ACTIVE,
      profile: {
        verificationStatus: owner.ownerProfile.verificationStatus,
        reviewedAt: owner.ownerProfile.reviewedAt,
        rejectionReason: owner.ownerProfile.rejectionReason,
      },
    },
  };
}

export async function rejectOwner(
  userId: string,
  adminId: string,
  reason: string,
): Promise<AdminOwnerActionResponse> {
  const existing = await repo.findPendingOwnerByUserId(userId);
  if (!existing?.ownerProfile) {
    throw new NotFoundError('USER_NOT_FOUND');
  }

  if (existing.ownerProfile.verificationStatus === OwnerVerificationStatus.REJECTED) {
    return {
      owner: {
        id: existing.id,
        email: existing.email,
        fullName: existing.fullName,
        status: existing.status,
        profile: {
          verificationStatus: existing.ownerProfile.verificationStatus,
          reviewedAt: existing.ownerProfile.reviewedAt,
          rejectionReason: existing.ownerProfile.rejectionReason,
        },
      },
    };
  }

  if (existing.ownerProfile.verificationStatus !== OwnerVerificationStatus.PENDING) {
    throw new ConflictError(
      'OWNER_NOT_PENDING',
      `Owner cannot be rejected while verification status is ${existing.ownerProfile.verificationStatus}`,
    );
  }

  const owner = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await repo.updateOwnerVerification(
      userId,
      {
        verificationStatus: OwnerVerificationStatus.REJECTED,
        rejectionReason: reason,
        reviewedAt: new Date(),
      },
      tx,
    );

    await bookingRepo.createAuditLog(
      {
        actorId: adminId,
        action: 'OWNER_REJECTED',
        resourceType: 'user',
        resourceId: userId,
        changes: { reason },
      },
      tx,
    );

    return updated;
  });

  if (!owner.ownerProfile) {
    throw new NotFoundError('USER_NOT_FOUND');
  }

  return {
    owner: {
      id: owner.id,
      email: owner.email,
      fullName: owner.fullName,
      status: owner.status,
      profile: {
        verificationStatus: owner.ownerProfile.verificationStatus,
        reviewedAt: owner.ownerProfile.reviewedAt,
        rejectionReason: owner.ownerProfile.rejectionReason,
      },
    },
  };
}
