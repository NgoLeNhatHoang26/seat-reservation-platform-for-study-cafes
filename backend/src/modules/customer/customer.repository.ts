import { prisma } from '../../config/prisma';
import type { CustomerProfile, Prisma, User } from '../../generated/prisma/client';

export type ProfileWithUser = {
  user: Pick<User, 'id' | 'email' | 'fullName' | 'phone' | 'role'>;
  profile: CustomerProfile | null;
};

export type UpdateProfileData = {
  fullName?: string;
  phone?: string | null;
  preferredCity?: string | null;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
};

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  customerProfile: true,
} as const;

export async function findByUserId(userId: string): Promise<ProfileWithUser | null> {
  const row = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: userSelect,
  });

  if (!row) {
    return null;
  }

  const { customerProfile, ...user } = row;
  return { user, profile: customerProfile };
}

export async function updateProfile(
  userId: string,
  data: UpdateProfileData,
): Promise<ProfileWithUser> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const userData: Prisma.UserUpdateInput = {};
    if (data.fullName !== undefined) {
      userData.fullName = data.fullName;
    }
    if (data.phone !== undefined) {
      userData.phone = data.phone;
    }

    if (Object.keys(userData).length > 0) {
      await tx.user.update({
        where: { id: userId },
        data: userData,
      });
    }

    const profileData: Prisma.CustomerProfileUpdateInput = {};
    if (data.preferredCity !== undefined) {
      profileData.preferredCity = data.preferredCity;
    }
    if (data.emailNotifications !== undefined) {
      profileData.emailNotifications = data.emailNotifications;
    }
    if (data.smsNotifications !== undefined) {
      profileData.smsNotifications = data.smsNotifications;
    }

    if (Object.keys(profileData).length > 0) {
      await tx.customerProfile.update({
        where: { userId },
        data: profileData,
      });
    }

    const row = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: userSelect,
    });

    const { customerProfile, ...user } = row;
    return { user, profile: customerProfile };
  });
}
