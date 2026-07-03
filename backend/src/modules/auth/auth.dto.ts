import type { UserRole, UserStatus } from '../../generated/prisma/enums';

export type RegisterCustomerDto = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  preferredCity?: string;
};

export type LoginDto = {
  email: string;
  password: string;
};

export type RefreshTokenDto = {
  refreshToken: string;
};

export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

export type UserResponse = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
};