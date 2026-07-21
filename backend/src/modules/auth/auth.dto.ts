import type { CafeStatus, UserRole, UserStatus } from '../../generated/prisma/enums';
export type RegisterCustomerDto = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  preferredCity?: string;
};

export type RegisterOwnerDocumentsDto = {
  businessLicenseUrl: string;
  idCardUrl: string;
};

export type RegisterOwnerDto = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  documents: RegisterOwnerDocumentsDto;
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

export type CustomerProfileSummary = {
  preferredCity: string | null;
  emailNotifications: boolean;
  smsNotifications: boolean;
};

export type CafeSummaryResponse = {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  status: CafeStatus;
};

export type MeResponse = {
  user: UserResponse;
  profile?: CustomerProfileSummary;
};

export type RegisterOwnerResponse = {
  user: UserResponse;
  message: string;
};

export type VerifyEmailDto = {
  token: string;
};

export type VerifyEmailResponse = {
  user: UserResponse;
  message: string;
};

export type ResendVerificationResponse = {
  message: string;
};