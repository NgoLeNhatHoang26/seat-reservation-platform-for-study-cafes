import { axiosInstance } from './axiosInstance';
import { normalizePaginated } from '../utils/pagination';
import type {
  CafePolicies,
  CreateCafePayload,
  GetOwnerBookingsParams,
  OwnerBookingListResponse,
  OwnerCafe,
  OwnerCafeDetailResponse,
  OwnerCafeListResponse,
  OwnerSeatLayoutResponse,
  SaveLayoutPayload,
  SaveLayoutResponse,
  UpdateCafePayload,
  UpdateCafeSettingsPayload,
} from '../types/cafe.types';
import type { CheckInResponse } from '../types/booking.types';

export async function listOwnerCafes(params?: {
  status?: string;
  limit?: number;
  cursor?: string;
}): Promise<OwnerCafeListResponse> {
  const { data } = await axiosInstance.get('/owner/cafes', { params });
  return normalizePaginated(data.data) as OwnerCafeListResponse;
}

export async function createCafe(
  payload: CreateCafePayload,
): Promise<{ cafe: OwnerCafe }> {
  const { data } = await axiosInstance.post<{ data: { cafe: OwnerCafe } }>(
    '/owner/cafes',
    payload,
  );
  return data.data;
}

export async function getOwnerCafe(
  cafeId: string,
): Promise<OwnerCafeDetailResponse> {
  const { data } = await axiosInstance.get<{ data: OwnerCafeDetailResponse }>(
    `/owner/cafes/${cafeId}`,
  );
  return data.data;
}

export async function updateCafe(
  cafeId: string,
  payload: UpdateCafePayload,
): Promise<{ cafe: OwnerCafe }> {
  const { data } = await axiosInstance.put<{ data: { cafe: OwnerCafe } }>(
    `/owner/cafes/${cafeId}`,
    payload,
  );
  return data.data;
}

export async function updateCafeSettings(
  cafeId: string,
  payload: UpdateCafeSettingsPayload,
): Promise<{ policies: CafePolicies }> {
  const { data } = await axiosInstance.patch<{ data: { policies: CafePolicies } }>(
    `/owner/cafes/${cafeId}/settings`,
    payload,
  );
  return data.data;
}

export async function getOwnerSeatLayout(
  cafeId: string,
  includeInactive = true,
): Promise<OwnerSeatLayoutResponse> {
  const { data } = await axiosInstance.get<{ data: OwnerSeatLayoutResponse }>(
    `/owner/cafes/${cafeId}/seats/layout`,
    { params: { includeInactive } },
  );
  return data.data;
}

export async function saveLayout(
  cafeId: string,
  payload: SaveLayoutPayload,
): Promise<SaveLayoutResponse> {
  const { data } = await axiosInstance.put<{ data: SaveLayoutResponse }>(
    `/owner/cafes/${cafeId}/seats/layout`,
    payload,
  );
  return data.data;
}

export async function getOwnerBookings(
  cafeId: string,
  params?: GetOwnerBookingsParams,
): Promise<OwnerBookingListResponse> {
  const { data } = await axiosInstance.get(
    `/owner/cafes/${cafeId}/bookings`,
    { params },
  );
  return normalizePaginated(data.data) as OwnerBookingListResponse;
}

export async function ownerCheckIn(
  cafeId: string,
  bookingId: string,
): Promise<CheckInResponse> {
  const { data } = await axiosInstance.post<{ data: CheckInResponse }>(
    `/owner/cafes/${cafeId}/bookings/${bookingId}/check-in`,
    {},
  );
  return data.data;
}
