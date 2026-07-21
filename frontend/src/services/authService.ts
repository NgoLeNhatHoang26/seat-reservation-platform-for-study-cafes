import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { axiosInstance } from './axiosInstance';
import type {
  AuthResponse,
  LoginPayload,
  MeResponse,
  RefreshResponse,
  RegisterCustomerPayload,
  RegisterOwnerPayload,
  RegisterOwnerResponse,
} from '../types/auth.types';

export async function register(
  payload: RegisterCustomerPayload,
): Promise<AuthResponse> {
  const { data } = await axiosInstance.post<{ data: AuthResponse }>(
    '/auth/register',
    payload,
  );
  return data.data;
}

export async function registerOwner(
  payload: RegisterOwnerPayload,
): Promise<RegisterOwnerResponse> {
  const { data } = await axiosInstance.post<{ data: RegisterOwnerResponse }>(
    '/auth/register-owner',
    payload,
  );
  return data.data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await axiosInstance.post<{ data: AuthResponse }>(
    '/auth/login',
    payload,
  );
  return data.data;
}

// Uses plain axios (no interceptors) to avoid infinite retry loop.
export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  const { data } = await axios.post<{ data: RefreshResponse }>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
  );
  return data.data;
}

export async function logout(refreshToken: string): Promise<void> {
  await axiosInstance.post('/auth/logout', { refreshToken });
}

export async function getMe(): Promise<MeResponse> {
  const { data } = await axiosInstance.get<{ data: MeResponse }>('/auth/me');
  return data.data;
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const { data } = await axiosInstance.post<{ data: { message: string } }>(
    '/auth/verify-email',
    { token },
  );
  return data.data;
}

export async function resendVerificationEmail(): Promise<{ message: string }> {
  const { data } = await axiosInstance.post<{ data: { message: string } }>(
    '/auth/resend-verification',
  );
  return data.data;
}
