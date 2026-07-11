import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as adminService from '../services/adminService';
import type {
  ApproveCafePayload,
  ApproveOwnerPayload,
  GetAdminUsersParams,
  RejectCafePayload,
  RejectOwnerPayload,
  SuspendUserPayload,
} from '../types/admin.types';

// All keys nested under ['admin'] for targeted invalidation.

export const adminKeys = {
  users: (params?: GetAdminUsersParams) =>
    ['admin', 'users', params ?? {}] as const,
  user: (userId: string) => ['admin', 'users', userId] as const,
  pendingCafes: () => ['admin', 'cafes', 'pending'] as const,
  pendingOwners: () => ['admin', 'owners', 'pending'] as const,
  owner: (userId: string) => ['admin', 'owners', userId] as const,
  cafe: (cafeId: string) => ['admin', 'cafes', cafeId] as const,
  cafeLayout: (cafeId: string) => ['admin', 'cafes', cafeId, 'layout'] as const,
};

export function useAdminUsers(params?: GetAdminUsersParams) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => adminService.listAdminUsers(params),
    staleTime: 0,
  });
}

export function useAdminUserDetail(userId: string) {
  return useQuery({
    queryKey: adminKeys.user(userId),
    queryFn: () => adminService.getAdminUser(userId),
    staleTime: 0,
    enabled: !!userId,
  });
}

export function useAdminPendingCafes(params?: { limit?: number; cursor?: string }) {
  return useQuery({
    queryKey: adminKeys.pendingCafes(),
    queryFn: () => adminService.listPendingCafes(params),
    staleTime: 0,
  });
}

export function useAdminCafeDetail(cafeId: string | null) {
  return useQuery({
    queryKey: adminKeys.cafe(cafeId ?? ''),
    queryFn: () => adminService.getAdminCafeDetail(cafeId!),
    staleTime: 0,
    enabled: !!cafeId,
  });
}

export function useAdminCafeSeatLayout(cafeId: string | null) {
  return useQuery({
    queryKey: adminKeys.cafeLayout(cafeId ?? ''),
    queryFn: () => adminService.getAdminCafeSeatLayout(cafeId!),
    staleTime: 0,
    enabled: !!cafeId,
  });
}

export function useAdminPendingOwners(params?: { limit?: number; cursor?: string }) {
  return useQuery({
    queryKey: adminKeys.pendingOwners(),
    queryFn: () => adminService.listPendingOwners(params),
    staleTime: 0,
  });
}

export function useAdminOwnerDetail(userId: string | null) {
  return useQuery({
    queryKey: adminKeys.owner(userId ?? ''),
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
      qc.invalidateQueries({ queryKey: adminKeys.users() });
      qc.invalidateQueries({ queryKey: adminKeys.user(userId) });
    },
  });
}

export function useUnsuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminService.unsuspendUser(userId),
    onSuccess: (_data, userId) => {
      qc.invalidateQueries({ queryKey: adminKeys.users() });
      qc.invalidateQueries({ queryKey: adminKeys.user(userId) });
    },
  });
}

export function useApproveCafe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cafeId, payload }: { cafeId: string; payload?: ApproveCafePayload }) =>
      adminService.approveCafe(cafeId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.pendingCafes() });
    },
  });
}

export function useRejectCafe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cafeId, payload }: { cafeId: string; payload: RejectCafePayload }) =>
      adminService.rejectCafe(cafeId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.pendingCafes() });
    },
  });
}

export function useApproveOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload?: ApproveOwnerPayload }) =>
      adminService.approveOwner(userId, payload),
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: adminKeys.pendingOwners() });
      qc.invalidateQueries({ queryKey: adminKeys.owner(userId) });
      qc.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useRejectOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: RejectOwnerPayload }) =>
      adminService.rejectOwner(userId, payload),
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: adminKeys.pendingOwners() });
      qc.invalidateQueries({ queryKey: adminKeys.owner(userId) });
      qc.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}
