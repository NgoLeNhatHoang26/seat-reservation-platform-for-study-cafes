import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import * as adminService from '../services/adminService';
import type {
  ApproveCafePayload,
  ApproveOwnerPayload,
  GetAdminUsersParams,
  RejectCafePayload,
  RejectOwnerPayload,
  SuspendUserPayload,
} from '../types/admin.types';

export function useAdminUsers(params?: GetAdminUsersParams) {
  return useQuery({
    queryKey: queryKeys.admin.users(params),
    queryFn: () => adminService.listAdminUsers(params),
    staleTime: 0,
  });
}

export function useAdminUserDetail(userId: string) {
  return useQuery({
    queryKey: queryKeys.admin.user(userId),
    queryFn: () => adminService.getAdminUser(userId),
    staleTime: 0,
    enabled: !!userId,
  });
}

export function useAdminPendingCafes(params?: { limit?: number; cursor?: string }) {
  return useQuery({
    queryKey: queryKeys.admin.pendingCafes(params),
    queryFn: () => adminService.listPendingCafes(params),
    staleTime: 0,
  });
}

export function useAdminCafeDetail(cafeId: string | null) {
  return useQuery({
    queryKey: queryKeys.admin.cafe(cafeId ?? ''),
    queryFn: () => adminService.getAdminCafeDetail(cafeId!),
    staleTime: 0,
    enabled: !!cafeId,
  });
}

export function useAdminCafeSeatLayout(cafeId: string | null) {
  return useQuery({
    queryKey: queryKeys.admin.cafeLayout(cafeId ?? ''),
    queryFn: () => adminService.getAdminCafeSeatLayout(cafeId!),
    staleTime: 0,
    enabled: !!cafeId,
  });
}

export function useAdminPendingOwners(params?: { limit?: number; cursor?: string }) {
  return useQuery({
    queryKey: queryKeys.admin.pendingOwners(params),
    queryFn: () => adminService.listPendingOwners(params),
    staleTime: 0,
  });
}

export function useAdminOwnerDetail(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.admin.owner(userId ?? ''),
    queryFn: () => adminService.getAdminOwnerDetail(userId!),
    staleTime: 0,
    enabled: !!userId,
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: SuspendUserPayload }) =>
      adminService.suspendUser(userId, payload),
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.usersAll() });
      qc.invalidateQueries({ queryKey: queryKeys.admin.user(userId) });
    },
  });
}

export function useUnsuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminService.unsuspendUser(userId),
    onSuccess: (_data, userId) => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.usersAll() });
      qc.invalidateQueries({ queryKey: queryKeys.admin.user(userId) });
    },
  });
}

export function useApproveCafe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cafeId, payload }: { cafeId: string; payload?: ApproveCafePayload }) =>
      adminService.approveCafe(cafeId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.pendingCafesAll() });
    },
  });
}

export function useRejectCafe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cafeId, payload }: { cafeId: string; payload: RejectCafePayload }) =>
      adminService.rejectCafe(cafeId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.pendingCafesAll() });
    },
  });
}

export function useApproveOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload?: ApproveOwnerPayload }) =>
      adminService.approveOwner(userId, payload),
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.pendingOwnersAll() });
      qc.invalidateQueries({ queryKey: queryKeys.admin.owner(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.admin.usersAll() });
    },
  });
}

export function useRejectOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: RejectOwnerPayload }) =>
      adminService.rejectOwner(userId, payload),
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.pendingOwnersAll() });
      qc.invalidateQueries({ queryKey: queryKeys.admin.owner(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.admin.usersAll() });
    },
  });
}
