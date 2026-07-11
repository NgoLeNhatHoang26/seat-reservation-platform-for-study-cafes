import type { UserRole, UserStatus } from './auth.types';
import type { CafePolicies, OwnerSeatLayoutResponse } from './cafe.types';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
}

/** Extended user returned by GET /admin/users/:id */
export interface AdminUserDetail extends AdminUser {
  /** Populated when role is CUSTOMER */
  bookingCount?: number;
  /** Populated when role is OWNER */
  cafeCount?: number;
  suspendedAt?: string;
  suspendedReason?: string;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

export interface AdminUserDetailResponse {
  user: AdminUserDetail;
}

export interface GetAdminUsersParams {
  search?: string;
  role?: string;
  status?: string;
  limit?: number;
  cursor?: string;
}

export interface SuspendUserPayload {
  /** Required, 5–500 characters */
  reason: string;
}

export interface SuspendUserResponse {
  user: AdminUser;
}

export interface PendingCafeOwner {
  id: string;
  fullName: string;
  email: string;
}

export interface PendingCafe {
  id: string;
  name: string;
  slug?: string;
  city: string;
  address: string;
  status: 'PENDING_VERIFICATION';
  amenities?: string[];
  createdAt?: string;
  owner?: PendingCafeOwner;
}

export interface PendingCafeListResponse {
  items: PendingCafe[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

export interface ApproveCafePayload {
  notes?: string;
}

export interface RejectCafePayload {
  /** Required */
  reason: string;
}

export interface CafeActionResponse {
  cafe: {
    id: string;
    name: string;
    status: string;
    approvedAt?: string;
  };
}

export interface AdminCafeDetail {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  address: string;
  city: string;
  phone?: string | null;
  email?: string | null;
  status: string;
  coverImageUrl?: string | null;
  galleryImages?: string[];
  amenities: string[];
  operatingHours: Record<string, { open: string; close: string } | undefined>;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  owner: PendingCafeOwner;
}

export interface AdminCafeDetailResponse {
  cafe: AdminCafeDetail;
  policies: CafePolicies;
}

export interface AdminCafeSeatLayoutResponse extends OwnerSeatLayoutResponse {}

export type OwnerVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PendingOwnerProfile {
  businessLicenseUrl: string;
  idCardUrl: string;
  verificationStatus: OwnerVerificationStatus;
  createdAt?: string;
}

export interface PendingOwner {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  status: UserStatus;
  createdAt?: string;
  profile: PendingOwnerProfile;
}

export interface PendingOwnerListResponse {
  items: PendingOwner[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

export interface AdminOwnerDetailResponse {
  owner: PendingOwner;
}

export interface ApproveOwnerPayload {
  notes?: string;
}

export interface RejectOwnerPayload {
  reason: string;
}

export interface OwnerActionResponse {
  owner: {
    id: string;
    email: string;
    fullName: string;
    status: UserStatus;
    profile: {
      verificationStatus: OwnerVerificationStatus;
      reviewedAt?: string | null;
      rejectionReason?: string | null;
    };
  };
}
