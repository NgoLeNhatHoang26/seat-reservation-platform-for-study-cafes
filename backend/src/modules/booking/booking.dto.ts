import { BookingStatus } from "@/generated/prisma/client";

export type CreateBookingDto = {
    cafeId: string;
    seatId: string;
    startTime: string;
    endTime: string;
    notes?: string;
}

export type CancelBookingDto = {
    bookingId: string;
    reason?: string;
}

export type BookingItemResponse = {
    id: string;
    confirmationNumber: string; 
    customerId: string;
    cafeId: string;
    seatId: string;
    startTime: string;
    endTime: string;
    status: BookingStatus;
    notes?: string | null;
    checkedInAt?: string | null;
    cancelledAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export type BookingSeatSummary = {
    id: string;
    label: string;
    zoneId: string;
};

export type BookingCafeSummary = {
    id: string;
    name: string;
    timezone: string;
}

export type BookingResponse = {
    booking: BookingItemResponse;
    seat: BookingSeatSummary;
    cafe: BookingCafeSummary;
};

export type CancelBookingPolicy = {
    cancellationDeadlineMinutes: number;
    cancelledWithinDeadline: boolean;
};
export type CancelBookingResponse = {
    booking: BookingItemResponse;
    policy: CancelBookingPolicy;
};

export type CheckInResponse = {
    booking: BookingItemResponse;
    seat: BookingSeatSummary;
};


export type BookingListItem = {
    id: string;
    startTime: string;
    endTime: string;
    status: BookingStatus;
    notes?: string | null;
    checkedInAt?: string | null;
    cancelledAt?: string | null;
    createdAt: string;
    seat: BookingSeatSummary;
    cafe: BookingCafeSummary;
};
export type ListBookingsParams = {
    limit: number;
    cursor?: string;
    status?: BookingStatus;
    upcoming?: boolean;
    cafeId?: string;
    sort?: '-startTime' | 'startTime';
};
  