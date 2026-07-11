import { NotFoundError, ValidationError } from '../../common/errors';
import type { CustomerProfileResponse, UpdateProfileDto } from './customer.dto';
import * as repo from './customer.repository';

function toProfileResponse(row: repo.ProfileWithUser): CustomerProfileResponse {
  return {
    user: {
      id: row.user.id,
      email: row.user.email,
      fullName: row.user.fullName,
      phone: row.user.phone,
      role: row.user.role,
    },
    profile: row.profile
      ? {
          preferredCity: row.profile.preferredCity,
          emailNotifications: row.profile.emailNotifications,
          smsNotifications: row.profile.smsNotifications,
        }
      : null,
  };
}

export async function getProfile(userId: string): Promise<CustomerProfileResponse> {
  const row = await repo.findByUserId(userId);
  if (!row) {
    throw new NotFoundError('USER_NOT_FOUND');
  }
  return toProfileResponse(row);
}

export async function updateProfile(
  userId: string,
  dto: UpdateProfileDto,
): Promise<CustomerProfileResponse> {
  const hasField = Object.values(dto).some((value) => value !== undefined);
  if (!hasField) {
    throw new ValidationError('VALIDATION_ERROR', 'At least one field is required');
  }

  const existing = await repo.findByUserId(userId);
  if (!existing) {
    throw new NotFoundError('USER_NOT_FOUND');
  }
  if (!existing.profile) {
    throw new NotFoundError('CUSTOMER_PROFILE_NOT_FOUND');
  }

  const updated = await repo.updateProfile(userId, dto);
  return toProfileResponse(updated);
}
