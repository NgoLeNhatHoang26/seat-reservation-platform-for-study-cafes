import { prisma } from '../../config/prisma';
import type { CustomerProfile, OwnerProfile, Prisma, User } from '../../generated/prisma/client';
import { UserRole, UserStatus } from '../../generated/prisma/enums';

export type CreateUserWithProfileData = {
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
  preferredCity?: string;
};

export type CreateOwnerWithProfileData = {
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
  businessLicenseUrl: string;
  idCardUrl: string;
};

export type UserWithProfile = User & {
  customerProfile: CustomerProfile | null;
  ownerProfile: OwnerProfile | null;
};


export type AuthUserSnapshot = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lockedUntil: Date | null;
};

export async function findAuthUserById(id: string): Promise<AuthUserSnapshot | null> {
  return prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      lockedUntil: true,
    },
  });
}

export async function findUserByEmail(email: string): Promise<UserWithProfile | null> {
  return prisma.user.findFirst({
    where: {
      email,
      deletedAt: null,
    },
    include: {
      customerProfile: true,
      ownerProfile: true,
    },
  });
}

/** Tìm user theo ID, kèm customer/owner profile (dùng cho GET /auth/me). */
export async function findUserById(id: string): Promise<UserWithProfile | null> {
  return prisma.user.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      customerProfile: true,
      ownerProfile: true,
    },
  });
}

export async function createUserWithProfile(
  data: CreateUserWithProfileData,
): Promise<{ user: User; profile: CustomerProfile }> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        phone: data.phone,
        role: UserRole.CUSTOMER,
        status: UserStatus.PENDING_EMAIL_VERIFICATION,
        emailVerifiedAt: null,
      },
    });

    const profile = await tx.customerProfile.create({
      data: {
        userId: user.id,
        preferredCity: data.preferredCity,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: 'USER_REGISTERED',
        resourceType: 'user',
        resourceId: user.id,
      },
    });

    return { user, profile };
  });
}

/** Tạo OWNER + hồ sơ giấy tờ xác minh trong một transaction (register-owner). */
export async function createOwnerWithProfile(
  data: CreateOwnerWithProfileData,
): Promise<{ user: User; profile: OwnerProfile }> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        phone: data.phone,
        role: UserRole.OWNER,
        status: UserStatus.PENDING_EMAIL_VERIFICATION,
      },
    });

    const profile = await tx.ownerProfile.create({
      data: {
        userId: user.id,
        businessLicenseUrl: data.businessLicenseUrl,
        idCardUrl: data.idCardUrl,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: 'OWNER_REGISTERED',
        resourceType: 'user',
        resourceId: user.id,
        changes: {
          verificationStatus: profile.verificationStatus,
        },
      },
    });

    return { user, profile };
  });
}

/** Ghi đè số lần đăng nhập thất bại (service tính attempts trước khi gọi). */
export async function updateUserLoginAttempts(
  userId: string,
  attempts: number,
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: attempts },
  });
}

/** Khóa tài khoản đến thời điểm lockedUntil; truyền null để mở khóa. */
export async function updateUserLockedUntil(
  userId: string,
  lockedUntil: Date | null,
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { lockedUntil },
  });
}

/** Cập nhật trạng thái tài khoản (ACTIVE, SUSPENDED, ...). */
export async function updateUserStatus(userId: string, status: UserStatus): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { status },
  });
}

export async function markEmailVerified(userId: string, activateAccount: boolean): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifiedAt: new Date(),
      ...(activateAccount ? { status: UserStatus.ACTIVE } : {}),
    },
  });
}