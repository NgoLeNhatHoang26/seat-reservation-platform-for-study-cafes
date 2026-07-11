import { prisma } from '../../config/prisma';
import type { Prisma } from '../../generated/prisma/client';
import { CafeStatus, OwnerVerificationStatus, UserRole, UserStatus } from '../../generated/prisma/enums';

type Tx = Prisma.TransactionClient;

export type FindUsersParams = {
  limit: number;
  cursor?: string;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
};

export type FindPendingCafesParams = {
  limit: number;
  cursor?: string;
};

export type FindPendingOwnersParams = {
  limit: number;
  cursor?: string;
};

export type UpdateUserStatusData = {
  suspendedAt?: Date | null;
  suspensionReason?: string | null;
};

export type UpdateCafeStatusData = {
  approvedAt?: Date | null;
  rejectionReason?: string | null;
};

const adminUserListSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

const adminUserDetailSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  suspendedAt: true,
  suspensionReason: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      bookings: true,
      ownedCafes: true,
    },
  },
} as const;

const pendingCafeSelect = {
  id: true,
  name: true,
  slug: true,
  address: true,
  city: true,
  phone: true,
  email: true,
  status: true,
  approvedAt: true,
  rejectionReason: true,
  createdAt: true,
  owner: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} as const;

const adminCafeDetailSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  address: true,
  city: true,
  phone: true,
  email: true,
  status: true,
  coverImageUrl: true,
  galleryImages: true,
  amenities: true,
  operatingHours: true,
  slotDurationMinutes: true,
  minAdvanceBookingMinutes: true,
  maxAdvanceBookingDays: true,
  cancellationDeadlineMinutes: true,
  maxConcurrentBookings: true,
  checkinGraceMinutes: true,
  timezone: true,
  approvedAt: true,
  rejectionReason: true,
  createdAt: true,
  owner: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} as const;

const pendingOwnerSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  status: true,
  createdAt: true,
  ownerProfile: {
    select: {
      id: true,
      businessLicenseUrl: true,
      idCardUrl: true,
      verificationStatus: true,
      rejectionReason: true,
      reviewedAt: true,
      createdAt: true,
    },
  },
} as const;

export type AdminUserListRow = Prisma.UserGetPayload<{ select: typeof adminUserListSelect }>;

export type AdminUserDetailRow = Prisma.UserGetPayload<{ select: typeof adminUserDetailSelect }>;

export type PendingCafeRow = Prisma.CafeGetPayload<{ select: typeof pendingCafeSelect }>;

export type AdminCafeRow = Prisma.CafeGetPayload<{ select: typeof pendingCafeSelect }>;

export type AdminCafeDetailRow = Prisma.CafeGetPayload<{ select: typeof adminCafeDetailSelect }>;

export type PendingOwnerRow = Prisma.UserGetPayload<{ select: typeof pendingOwnerSelect }>;

export async function findUsers(params: FindUsersParams): Promise<AdminUserListRow[]> {
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(params.role ? { role: params.role } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { email: { contains: params.search, mode: 'insensitive' } },
              { fullName: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(params.cursor ? { id: { lt: params.cursor } } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: params.limit + 1,
    select: adminUserListSelect,
  });
}

export async function findUserById(userId: string): Promise<AdminUserDetailRow | null> {
  return prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
    select: adminUserDetailSelect,
  });
}
export async function updateUserStatus(
  userId: string,
  status: UserStatus,
  data: UpdateUserStatusData,
  tx?: Tx,
): Promise<AdminUserDetailRow> {
  const client = tx ?? prisma;

  return client.user.update({
    where: { id: userId },
    data: {
      status,
      ...(data.suspendedAt !== undefined ? { suspendedAt: data.suspendedAt } : {}),
      ...(data.suspensionReason !== undefined ? { suspensionReason: data.suspensionReason } : {}),
    },
    select: adminUserDetailSelect,
  });
}

export async function findPendingOwners(
  params: FindPendingOwnersParams,
): Promise<PendingOwnerRow[]> {
  return prisma.user.findMany({
    where: {
      role: UserRole.OWNER,
      deletedAt: null,
      ownerProfile: {
        verificationStatus: OwnerVerificationStatus.PENDING,
      },
      ...(params.cursor ? { id: { lt: params.cursor } } : {}),
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'desc' }],
    take: params.limit + 1,
    select: pendingOwnerSelect,
  });
}

export async function findPendingOwnerByUserId(
  userId: string,
): Promise<PendingOwnerRow | null> {
  return prisma.user.findFirst({
    where: {
      id: userId,
      role: UserRole.OWNER,
      deletedAt: null,
      ownerProfile: {
        verificationStatus: OwnerVerificationStatus.PENDING,
      },
    },
    select: pendingOwnerSelect,
  });
}

export async function findOwnerByUserId(userId: string): Promise<PendingOwnerRow | null> {
  return prisma.user.findFirst({
    where: {
      id: userId,
      role: UserRole.OWNER,
      deletedAt: null,
      ownerProfile: { isNot: null },
    },
    select: pendingOwnerSelect,
  });
}

export async function updateOwnerVerification(
  userId: string,
  data: {
    verificationStatus: OwnerVerificationStatus;
    rejectionReason?: string | null;
    reviewedAt: Date;
  },
  tx?: Tx,
): Promise<PendingOwnerRow> {
  const client = tx ?? prisma;

  await client.ownerProfile.update({
    where: { userId },
    data: {
      verificationStatus: data.verificationStatus,
      reviewedAt: data.reviewedAt,
      ...(data.rejectionReason !== undefined
        ? { rejectionReason: data.rejectionReason }
        : {}),
    },
  });

  const row = await client.user.findFirst({
    where: { id: userId },
    select: pendingOwnerSelect,
  });

  if (!row) {
    throw new Error(`Owner user ${userId} not found after profile update`);
  }

  return row;
}

export async function findPendingCafes(
  params: FindPendingCafesParams,
): Promise<PendingCafeRow[]> {
  return prisma.cafe.findMany({
    where: {
      status: CafeStatus.PENDING_VERIFICATION,
      ...(params.cursor ? { id: { lt: params.cursor } } : {}),
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'desc' }],
    take: params.limit + 1,
    select: pendingCafeSelect,
  });
}

export async function findCafeById(cafeId: string): Promise<PendingCafeRow | null> {
  return prisma.cafe.findUnique({
    where: { id: cafeId },
    select: pendingCafeSelect,
  });
}

export async function findCafeDetailById(cafeId: string): Promise<AdminCafeDetailRow | null> {
  return prisma.cafe.findUnique({
    where: { id: cafeId },
    select: adminCafeDetailSelect,
  });
}

export async function updateCafeStatus(
  cafeId: string,
  status: CafeStatus,
  data: UpdateCafeStatusData,
  tx?: Tx,
): Promise<AdminCafeRow> {
  const client = tx ?? prisma;

  return client.cafe.update({
    where: { id: cafeId },
    data: {
      status,
      ...(data.approvedAt !== undefined ? { approvedAt: data.approvedAt } : {}),
      ...(data.rejectionReason !== undefined ? { rejectionReason: data.rejectionReason } : {}),
    },
    select: pendingCafeSelect,
  });
}
