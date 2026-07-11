import { axiosInstance } from './axiosInstance';
import { normalizePaginated } from '../utils/pagination';
import type {
  CafeDetailResponse,
  CafeListItem,
  CafeListResponse,
  SeatAvailabilityResponse,
  SeatLayoutResponse,
} from '../types/cafe.types';

export interface BrowseCafesParams {
  city?: string;
  limit?: number;
  cursor?: string;
  sort?: string;
}

export interface SearchCafesParams {
  city: string;
  amenities?: string[];
  date?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
  cursor?: string;
}

export interface SeatAvailabilityParams {
  startTime: string; // ISO 8601 UTC
  endTime: string;
  zoneId?: string;
}

export async function getCafes(
  params: BrowseCafesParams = {},
): Promise<CafeListResponse> {
  const { data } = await axiosInstance.get('/cafes', { params });
  return normalizePaginated<CafeListItem>(data.data) as CafeListResponse;
}

export async function searchCafes(
  params: SearchCafesParams,
): Promise<CafeListResponse> {
  const { amenities, ...rest } = params;
  const { data } = await axiosInstance.get('/cafes/search', {
      params: {
        ...rest,
        ...(amenities?.length ? { amenities: amenities.join(',') } : {}),
      },
    });
  return normalizePaginated<CafeListItem>(data.data) as CafeListResponse;
}

export async function getCafeDetail(
  cafeId: string,
): Promise<CafeDetailResponse> {
  const { data } = await axiosInstance.get<{ data: CafeDetailResponse }>(
    `/cafes/${cafeId}`,
  );
  return data.data;
}

export async function getSeatLayout(
  cafeId: string,
): Promise<SeatLayoutResponse> {
  const { data } = await axiosInstance.get<{ data: SeatLayoutResponse }>(
    `/cafes/${cafeId}/seats/layout`,
  );
  return data.data;
}

export async function getSeatAvailability(
  cafeId: string,
  params: SeatAvailabilityParams,
): Promise<SeatAvailabilityResponse> {
  const { data } = await axiosInstance.get<{ data: SeatAvailabilityResponse }>(
    `/cafes/${cafeId}/seats/availability`,
    { params },
  );
  return data.data;
}
