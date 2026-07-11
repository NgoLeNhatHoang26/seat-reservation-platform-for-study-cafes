export type UserRole = 'CUSTOMER' | 'OWNER' | 'ADMIN';

export type UserStatus =
  | 'ACTIVE'
  | 'PENDING_EMAIL_VERIFICATION'
  | 'SUSPENDED';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
}

export interface CustomerProfile {
  preferredCity?: string;
  phone?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterCustomerPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  preferredCity?: string;
}

export interface DaySchedule {
  open: string;
  close: string;
}

export type OperatingHours = Record<string, DaySchedule>;

export interface RegisterOwnerDocumentsPayload {
  businessLicenseUrl: string;
  idCardUrl: string;
}

export interface RegisterOwnerPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  documents: RegisterOwnerDocumentsPayload;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterOwnerResponse {
  user: User;
  message: string;
}

export interface MeResponse {
  user: User;
  profile?: CustomerProfile;
}

export interface RefreshResponse {
  tokens: AuthTokens;
}
