import { useMutation } from '@tanstack/react-query';
import {
  updateCustomerProfile,
  type UpdateProfilePayload,
  type UpdateProfileResponse,
} from '../services/customerService';

export function useUpdateProfile() {
  return useMutation<UpdateProfileResponse, Error, UpdateProfilePayload>({
    mutationFn: updateCustomerProfile,
  });
}
