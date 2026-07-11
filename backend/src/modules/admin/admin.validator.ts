import { z } from 'zod';
import { UserRole, UserStatus } from '../../generated/prisma/enums';

export const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  limit: z.string().optional(),
  cursor: z.string().optional(),
});

export const listPendingCafesQuerySchema = z.object({
  limit: z.string().optional(),
  cursor: z.string().optional(),
});

export const listPendingOwnersQuerySchema = z.object({
  limit: z.string().optional(),
  cursor: z.string().optional(),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

export const cafeIdParamSchema = z.object({
  cafeId: z.string().uuid(),
});

export const suspendUserBodySchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export const unsuspendUserBodySchema = z.object({});

export const approveCafeBodySchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

export const approveOwnerBodySchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

export const rejectCafeBodySchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export const rejectOwnerBodySchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type ApproveCafeBody = z.infer<typeof approveCafeBodySchema>;
export type ApproveOwnerBody = z.infer<typeof approveOwnerBodySchema>;
export type RejectCafeBody = z.infer<typeof rejectCafeBodySchema>;
export type RejectOwnerBody = z.infer<typeof rejectOwnerBodySchema>;
export type SuspendUserBody = z.infer<typeof suspendUserBodySchema>;
