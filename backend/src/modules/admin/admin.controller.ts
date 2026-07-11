import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../common/errors';
import { parsePaginationParams } from '../../common/pagination';
import { sendPaginatedSuccess, sendSuccess } from '../../common/response';
import { UserRole, UserStatus } from '../../generated/prisma/enums';
import * as adminService from './admin.service';
import type {
  ApproveCafeBody,
  ApproveOwnerBody,
  ListUsersQuery,
  RejectCafeBody,
  RejectOwnerBody,
  SuspendUserBody,
} from './admin.validator';

function asRouteParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function requireAdmin(req: Request) {
  if (!req.user) {
    throw new UnauthorizedError('UNAUTHORIZED', 'Authentication required');
  }
  return req.user;
}

export async function listUsers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    requireAdmin(req);
    const query = req.query as ListUsersQuery;
    const { limit, cursor } = parsePaginationParams(req.query);

    const result = await adminService.listUsers({
      limit,
      cursor,
      ...(query.search ? { search: query.search } : {}),
      ...(query.role ? { role: query.role as UserRole } : {}),
      ...(query.status ? { status: query.status as UserStatus } : {}),
    });

    sendPaginatedSuccess(res, result.items, result.nextCursor, result.hasMore);
  } catch (err) {
    next(err);
  }
}

export async function getUserDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    requireAdmin(req);
    const userId = asRouteParam(req.params.userId);
    const data = await adminService.getUserById(userId);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function suspendUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const userId = asRouteParam(req.params.userId);
    const body = req.body as SuspendUserBody;
    const data = await adminService.suspendUser(userId, admin.id, body.reason);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function unsuspendUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const userId = asRouteParam(req.params.userId);
    const data = await adminService.unsuspendUser(userId, admin.id);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function listPendingCafes(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    requireAdmin(req);
    const { limit, cursor } = parsePaginationParams(req.query);
    const result = await adminService.listPendingCafes({ limit, cursor });
    sendPaginatedSuccess(res, result.items, result.nextCursor, result.hasMore);
  } catch (err) {
    next(err);
  }
}

export async function getCafeDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    requireAdmin(req);
    const cafeId = asRouteParam(req.params.cafeId);
    const data = await adminService.getCafeDetail(cafeId);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getCafeSeatLayout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    requireAdmin(req);
    const cafeId = asRouteParam(req.params.cafeId);
    const data = await adminService.getCafeSeatLayout(cafeId);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function approveCafe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const cafeId = asRouteParam(req.params.cafeId);
    const body = req.body as ApproveCafeBody;
    const data = await adminService.approveCafe(cafeId, admin.id, body.notes);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function rejectCafe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const cafeId = asRouteParam(req.params.cafeId);
    const body = req.body as RejectCafeBody;
    const data = await adminService.rejectCafe(cafeId, admin.id, body.reason);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function listPendingOwners(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    requireAdmin(req);
    const { limit, cursor } = parsePaginationParams(req.query);
    const result = await adminService.listPendingOwners({ limit, cursor });
    sendPaginatedSuccess(res, result.items, result.nextCursor, result.hasMore);
  } catch (err) {
    next(err);
  }
}

export async function getOwnerDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    requireAdmin(req);
    const userId = asRouteParam(req.params.userId);
    const data = await adminService.getOwnerDetail(userId);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function approveOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const userId = asRouteParam(req.params.userId);
    const body = req.body as ApproveOwnerBody;
    const data = await adminService.approveOwner(userId, admin.id, body.notes);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function rejectOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const userId = asRouteParam(req.params.userId);
    const body = req.body as RejectOwnerBody;
    const data = await adminService.rejectOwner(userId, admin.id, body.reason);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
