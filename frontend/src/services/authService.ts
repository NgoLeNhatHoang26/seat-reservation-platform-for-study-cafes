import axios from 'axios';
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
    '/api/v1/auth/refresh',
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
