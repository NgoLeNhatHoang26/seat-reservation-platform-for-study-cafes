import { CafeStatus } from '../../generated/prisma/enums';
import type { CafePolicies } from './cafe.dto';
import type { OwnerBookingListRow } from './owner.repository';

export function toOwnerCafeResponse(cafe: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    address: string;
    city: string;
    phone: string | null;
    email: string | null;
    status: CafeStatus;
    coverImageUrl: string | null;
    galleryImages: unknown;
    amenities: unknown;
    operatingHours: unknown;
    slotDurationMinutes: number;
    minAdvanceBookingMinutes: number;
    maxAdvanceBookingDays: number;
    cancellationDeadlineMinutes: number;
    maxConcurrentBookings: number;
    checkinGraceMinutes: number;
    timezone: string;
    rejectionReason?: string | null;
    approvedAt?: Date | null;
    createdAt?: Date;
  }) {
    const policies: CafePolicies = {
      slotDurationMinutes: cafe.slotDurationMinutes,
      minAdvanceBookingMinutes: cafe.minAdvanceBookingMinutes,
      maxAdvanceBookingDays: cafe.maxAdvanceBookingDays,
      cancellationDeadlineMinutes: cafe.cancellationDeadlineMinutes,
      maxConcurrentBookings: cafe.maxConcurrentBookings,
      checkinGraceMinutes: cafe.checkinGraceMinutes,
      timezone: cafe.timezone,
    };
    return {
      id: cafe.id,
      name: cafe.name,
      slug: cafe.slug,
      description: cafe.description,
      address: cafe.address,
      city: cafe.city,
      phone: cafe.phone,
      email: cafe.email,
      status: cafe.status,
      coverImageUrl: cafe.coverImageUrl,
      galleryImages: cafe.galleryImages,
      amenities: cafe.amenities,
      operatingHours: cafe.operatingHours,
      rejectionReason: cafe.rejectionReason ?? null,
      approvedAt: cafe.approvedAt ?? null,
      policies,
    };
}
function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    return `${local.slice(0, 2)}***@${domain}`;
  }
  
export function toOwnerBookingListItem(row: OwnerBookingListRow) {
    return {
      id: row.id,
      confirmationNumber: row.confirmationNumber,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      status: row.status,
      notes: row.notes,
      checkedInAt: row.checkedInAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      customer: {
        id: row.customer.id,
        fullName: row.customer.fullName,
        email: maskEmail(row.customer.email), // owner@example.com → ow***@example.com
      },
      seat: {
        id: row.seat.id,
        label: row.seat.seatNumber,
        zoneId: row.seat.zoneId,
      },
    };
}