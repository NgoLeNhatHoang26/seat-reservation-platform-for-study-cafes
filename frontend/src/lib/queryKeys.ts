import type { SeatAvailabilityParams } from '../services/cafeService';
import type { GetAdminUsersParams } from '../types/admin.types';
import type { BookingStatus } from '../types/booking.types';
import type { GetOwnerBookingsParams } from '../types/cafe.types';
import type { GetNotificationsParams } from '../types/notification.types';

export const queryKeys = {
  cafes: {
    all: ['cafes'] as const,
    lists: () => [...queryKeys.cafes.all, 'list'] as const,
    list: (params: {
      city?: string;
      amenities?: string[];
      limit?: number;
      sort?: string;
    }) => [...queryKeys.cafes.lists(), params] as const,
    details: () => [...queryKeys.cafes.all, 'detail'] as const,
    detail: (cafeId: string) => [...queryKeys.cafes.details(), cafeId] as const,
    layout: (cafeId: string) =>
      [...queryKeys.cafes.detail(cafeId), 'layout'] as const,
    availability: (cafeId: string, params: SeatAvailabilityParams | null) =>
      [...queryKeys.cafes.detail(cafeId), 'availability', params] as const,
    availabilityAll: (cafeId: string) =>
      [...queryKeys.cafes.detail(cafeId), 'availability'] as const,
  },

  bookings: {
    all: ['bookings'] as const,
    lists: () => [...queryKeys.bookings.all, 'list'] as const,
    list: (params: {
      status?: BookingStatus;
      upcoming?: boolean;
      cafeId?: string;
      limit?: number;
    }) => [...queryKeys.bookings.lists(), params] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    list: (params: GetNotificationsParams = {}) =>
      [...queryKeys.notifications.all, params] as const,
  },

  owner: {
    all: ['owner'] as const,
    cafes: () => [...queryKeys.owner.all, 'cafes'] as const,
    cafe: (cafeId: string) => [...queryKeys.owner.cafes(), cafeId] as const,
    layout: (cafeId: string) =>
      [...queryKeys.owner.cafe(cafeId), 'layout'] as const,
    bookings: (cafeId: string, params?: GetOwnerBookingsParams) =>
      [...queryKeys.owner.cafe(cafeId), 'bookings', params ?? {}] as const,
    bookingsAll: (cafeId: string) =>
      [...queryKeys.owner.cafe(cafeId), 'bookings'] as const,
  },

  admin: {
    all: ['admin'] as const,
    users: (params?: GetAdminUsersParams) =>
      [...queryKeys.admin.all, 'users', params ?? {}] as const,
    usersAll: () => [...queryKeys.admin.all, 'users'] as const,
    user: (userId: string) =>
      [...queryKeys.admin.all, 'users', userId] as const,
    pendingCafes: (params?: { limit?: number; cursor?: string }) =>
      [...queryKeys.admin.all, 'cafes', 'pending', params ?? {}] as const,
    pendingCafesAll: () =>
      [...queryKeys.admin.all, 'cafes', 'pending'] as const,
    cafe: (cafeId: string) =>
      [...queryKeys.admin.all, 'cafes', cafeId] as const,
    cafeLayout: (cafeId: string) =>
      [...queryKeys.admin.cafe(cafeId), 'layout'] as const,
    pendingOwners: (params?: { limit?: number; cursor?: string }) =>
      [...queryKeys.admin.all, 'owners', 'pending', params ?? {}] as const,
    pendingOwnersAll: () =>
      [...queryKeys.admin.all, 'owners', 'pending'] as const,
    owner: (userId: string) =>
      [...queryKeys.admin.all, 'owners', userId] as const,
  },
} as const;

export const NOTIFICATION_LIST_PARAMS = { limit: 20 } as const;
