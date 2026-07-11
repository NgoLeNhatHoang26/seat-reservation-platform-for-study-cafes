import { axiosInstance } from './axiosInstance';
import { normalizePaginated } from '../utils/pagination';
import type {
  AdminUserDetailResponse,
  AdminUserListResponse,
  AdminCafeDetailResponse,
  AdminCafeSeatLayoutResponse,
  ApproveCafePayload,
  ApproveOwnerPayload,
  CafeActionResponse,
  GetAdminUsersParams,
  OwnerActionResponse,
  PendingCafeListResponse,
  PendingOwnerListResponse,
  AdminOwnerDetailResponse,
  RejectCafePayload,
  RejectOwnerPayload,
  SuspendUserPayload,
  SuspendUserResponse,
} from '../types/admin.types';

export async function listAdminUsers(
  params?: GetAdminUsersParams,
): Promise<AdminUserListResponse> {
  const { data } = await axiosInstance.get('/admin/users', { params });
  return normalizePaginated(data.data) as AdminUserListResponse;
}

export async function getAdminUser(userId: string): Promise<AdminUserDetailResponse> {
  const { data } = await axiosInstance.get<{ data: AdminUserDetailResponse }>(
    `/admin/users/${userId}`,
  );
  return data.data;
}

export async function suspendUser(
  userId: string,
  payload: SuspendUserPayload,
): Promise<SuspendUserResponse> {
  const { data } = await axiosInstance.put<{ data: SuspendUserResponse }>(
    `/admin/users/${userId}/suspend`,
    payload,
  );
  return data.data;
}

export async function unsuspendUser(userId: string): Promise<SuspendUserResponse> {
  const { data } = await axiosInstance.put<{ data: SuspendUserResponse }>(
    `/admin/users/${userId}/unsuspend`,
    {},
  );
  return data.data;
}

export async function listPendingCafes(params?: {
  limit?: number;
  cursor?: string;
}): Promise<PendingCafeListResponse> {
  const { data } = await axiosInstance.get('/admin/cafes/pending', { params });
  return normalizePaginated(data.data) as PendingCafeListResponse;
}

export async function getAdminCafeDetail(
  cafeId: string,
): Promise<AdminCafeDetailResponse> {
  const { data } = await axiosInstance.get<{ data: AdminCafeDetailResponse }>(
    `/admin/cafes/${cafeId}`,
  );
  return data.data;
}

export async function getAdminCafeSeatLayout(
  cafeId: string,
): Promise<AdminCafeSeatLayoutResponse> {
  const { data } = await axiosInstance.get<{ data: AdminCafeSeatLayoutResponse }>(
    `/admin/cafes/${cafeId}/seats/layout`,
  );
  return data.data;
}

export async function approveCafe(
  cafeId: string,
  payload?: ApproveCafePayload,
): Promise<CafeActionResponse> {
  const { data } = await axiosInstance.put<{ data: CafeActionResponse }>(
    `/admin/cafes/${cafeId}/approve`,
    payload ?? {},
  );
  return data.data;
}

export async function rejectCafe(
  cafeId: string,
  payload: RejectCafePayload,
): Promise<CafeActionResponse> {
  const { data } = await axiosInstance.put<{ data: CafeActionResponse }>(
    `/admin/cafes/${cafeId}/reject`,
    payload,
  );
  return data.data;
}

export async function listPendingOwners(params?: {
  limit?: number;
  cursor?: string;
}): Promise<PendingOwnerListResponse> {
  const { data } = await axiosInstance.get('/admin/owners/pending', { params });
  return normalizePaginated(data.data) as PendingOwnerListResponse;
}

export async function getAdminOwnerDetail(userId: string): Promise<AdminOwnerDetailResponse> {
  const { data } = await axiosInstance.get<{ data: AdminOwnerDetailResponse }>(
    `/admin/owners/${userId}`,
  );
  return data.data;
}

export async function approveOwner(
  userId: string,
  payload?: ApproveOwnerPayload,
): Promise<OwnerActionResponse> {
  const { data } = await axiosInstance.put<{ data: OwnerActionResponse }>(
    `/admin/owners/${userId}/approve`,
    payload ?? {},
  );
  return data.data;
}

export async function rejectOwner(
  userId: string,
  payload: RejectOwnerPayload,
): Promise<OwnerActionResponse> {
  const { data } = await axiosInstance.put<{ data: OwnerActionResponse }>(
    `/admin/owners/${userId}/reject`,
    payload,
  );
  return data.data;
}
