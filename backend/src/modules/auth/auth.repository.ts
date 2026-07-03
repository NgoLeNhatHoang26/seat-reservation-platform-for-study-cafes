import { prisma } from '../../config/prisma';
import type { CustomerProfile, Prisma, User } from '../../generated/prisma/client';
import { UserRole, UserStatus } from '../../generated/prisma/enums';

export type CreateUserWithProfileData = {
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
  preferredCity?: string;
};

export type CreateOwnerUserData = {
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
};

export type UserWithProfile = User & {
  customerProfile: CustomerProfile | null;
};

/** Tìm user theo email, chỉ lấy bản ghi chưa bị soft-delete. */
export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: {
      email,
      deletedAt: null,
    },
  });
}

/** Tìm user theo ID, kèm customer profile (dùng cho GET /auth/me). */
export async function findUserById(id: string): Promise<UserWithProfile | null> {
  return prisma.user.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      customerProfile: true,
    },
  });
}

/**
 * Tạo CUSTOMER + customer_profile + audit log trong một transaction.
 * Nếu bất kỳ bước nào fail → toàn bộ rollback.
 */
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

/** Tạo user với role OWNER (dùng cho register-owner, chưa tạo café ở đây). */
export async function createOwnerUser(data: CreateOwnerUserData): Promise<User> {
  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      phone: data.phone,
      role: UserRole.OWNER,
      status: UserStatus.PENDING_EMAIL_VERIFICATION,
    },
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

/** Đánh dấu email đã xác minh và chuyển status sang ACTIVE. */
export async function updateEmailVerifiedAt(userId: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifiedAt: new Date(),
      status: UserStatus.ACTIVE,
    },
  });
}
