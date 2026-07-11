import { axiosInstance } from './axiosInstance';
import type { CustomerProfile, User } from '../types/auth.types';

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  preferredCity?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
}

export interface UpdateProfileResponse {
  user?: User;
  profile?: CustomerProfile;
}

export async function updateCustomerProfile(
  payload: UpdateProfilePayload,
): Promise<UpdateProfileResponse> {
  const { data } = await axiosInstance.patch<{ data: UpdateProfileResponse }>(
    '/customers/profile',
    payload,
  );
  return data.data;
}
