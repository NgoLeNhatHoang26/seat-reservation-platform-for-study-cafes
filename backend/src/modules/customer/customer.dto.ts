import type { UserRole } from '../../generated/prisma/enums';

export type UpdateProfileDto = {
  fullName?: string;
  phone?: string | null;
  preferredCity?: string | null;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
};

export type CustomerProfileResponse = {
  user: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    role: UserRole;
  };
  profile: {
    preferredCity: string | null;
    emailNotifications: boolean;
    smsNotifications: boolean;
  } | null;
};
