import { randomUUID } from 'crypto';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app';
import {
  cleanupTables,
  disconnectTestDatabase,
  setupTestDatabase,
  testPrisma,
} from '../helpers/db';
import { signAccessToken } from '../../src/modules/auth/jwt.service';
import {
  BookingStatus,
  CafeStatus,
  SeatType,
  UserRole,
  UserStatus,
} from '../../src/generated/prisma/enums';

const BOOKINGS_BASE = '/api/v1/bookings';
const ALL_DAY_OPERATING_HOURS = {
  monday: { open: '00:00', close: '23:59' },
  tuesday: { open: '00:00', close: '23:59' },
  wednesday: { open: '00:00', close: '23:59' },
  thursday: { open: '00:00', close: '23:59' },
  friday: { open: '00:00', close: '23:59' },
  saturday: { open: '00:00', close: '23:59' },
  sunday: { open: '00:00', close: '23:59' },
};

type TestUser = {
  id: string;
  email: string;
  token: string;
};

type TestCafe = {
  cafeId: string;
  zoneId: string;
  seatId: string;
};

function futureSlot(daysAhead = 1) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + daysAhead);
  start.setUTCHours(10, 0, 0, 0);

  const end = new Date(start);
  end.setUTCHours(12, 0, 0, 0);

  return { start, end };
}

function createBookingPayload(cafeId: string, seatId: string, slot = futureSlot()) {
  return {
    cafeId,
    seatId,
    startTime: slot.start.toISOString(),
    endTime: slot.end.toISOString(),
  };
}

async function createUser(role: UserRole): Promise<TestUser> {
  const email = `${role.toLowerCase()}-${randomUUID()}@test.com`;
  const user = await testPrisma.user.create({
    data: {
      email,
      passwordHash: 'not-used-in-booking-tests',
      fullName: `Integration ${role}`,
      role,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      ...(role === UserRole.CUSTOMER
        ? { customerProfile: { create: {} } }
        : {}),
    },
  });

  return {
    id: user.id,
    email: user.email,
    token: signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    }),
  };
}

async function createCafe(ownerId: string): Promise<TestCafe> {
  const cafe = await testPrisma.cafe.create({
    data: {
      ownerId,
      name: 'Integration Booking Cafe',
      slug: `integration-booking-cafe-${randomUUID()}`,
      address: '123 Test Street',
      city: 'Hanoi',
      status: CafeStatus.ACTIVE,
      approvedAt: new Date(),
      operatingHours: ALL_DAY_OPERATING_HOURS,
      amenities: ['wifi'],
      slotDurationMinutes: 120,
      minAdvanceBookingMinutes: 0,
      maxAdvanceBookingDays: 30,
      cancellationDeadlineMinutes: 60,
      maxConcurrentBookings: 3,
      checkinGraceMinutes: 15,
      timezone: 'UTC',
      zones: {
        create: {
          name: 'Zone A',
          displayOrder: 1,
          seats: {
            create: {
              seatNumber: 'A1',
              seatType: SeatType.STANDARD,
              amenities: [],
              isActive: true,
            },
          },
        },
      },
    },
    include: {
      zones: { include: { seats: true } },
    },
  });

  const zone = cafe.zones[0];
  const seat = zone.seats[0];

  return {
    cafeId: cafe.id,
    zoneId: zone.id,
    seatId: seat.id,
  };
}

async function createConfirmedBooking(
  customerId: string,
  cafeId: string,
  seatId: string,
  status: BookingStatus = BookingStatus.CONFIRMED,
  startTime = futureSlot(1).start,
) {
  const endTime = new Date(startTime.getTime() + 120 * 60_000);
  return testPrisma.booking.create({
    data: {
      confirmationNumber: `BK-${randomUUID()}`,
      customerId,
      cafeId,
      seatId,
      startTime,
      endTime,
      status,
      checkedInAt: status === BookingStatus.CHECKED_IN ? new Date() : null,
    },
  });
}

async function createFixture() {
  const owner = await createUser(UserRole.OWNER);
  const customer = await createUser(UserRole.CUSTOMER);
  const cafe = await createCafe(owner.id);
  return { owner, customer, cafe };
}

describe('Booking API integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTables();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('POST /bookings valid payload with Idempotency-Key returns 201', async () => {
    const { customer, cafe } = await createFixture();
    const payload = createBookingPayload(cafe.cafeId, cafe.seatId);

    const response = await request(app)
      .post(BOOKINGS_BASE)
      .set('Authorization', `Bearer ${customer.token}`)
      .set('Idempotency-Key', `booking-${randomUUID()}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        booking: {
          customerId: customer.id,
          cafeId: cafe.cafeId,
          seatId: cafe.seatId,
          status: BookingStatus.CONFIRMED,
        },
        seat: {
          id: cafe.seatId,
          label: 'A1',
          zoneId: cafe.zoneId,
        },
      },
    });
  });

  it('POST /bookings same seat and slot concurrently returns exactly one 201 and one 409', async () => {
    const owner = await createUser(UserRole.OWNER);
    const customerA = await createUser(UserRole.CUSTOMER);
    const customerB = await createUser(UserRole.CUSTOMER);
    const cafe = await createCafe(owner.id);
    const payload = createBookingPayload(cafe.cafeId, cafe.seatId);

    const [responseA, responseB] = await Promise.all([
      request(app)
        .post(BOOKINGS_BASE)
        .set('Authorization', `Bearer ${customerA.token}`)
        .set('Idempotency-Key', `booking-${randomUUID()}`)
        .send(payload),
      request(app)
        .post(BOOKINGS_BASE)
        .set('Authorization', `Bearer ${customerB.token}`)
        .set('Idempotency-Key', `booking-${randomUUID()}`)
        .send(payload),
    ]);

    const statuses = [responseA.status, responseB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const conflictResponse = [responseA, responseB].find((response) => response.status === 409);
    expect(conflictResponse?.body).toMatchObject({
      success: false,
      error: 'SEAT_ALREADY_BOOKED',
    });

    const count = await testPrisma.booking.count({
      where: {
        cafeId: cafe.cafeId,
        seatId: cafe.seatId,
        status: BookingStatus.CONFIRMED,
      },
    });
    expect(count).toBe(1);
  });

  it('POST /bookings without Idempotency-Key returns 400', async () => {
    const { customer, cafe } = await createFixture();

    const response = await request(app)
      .post(BOOKINGS_BASE)
      .set('Authorization', `Bearer ${customer.token}`)
      .send(createBookingPayload(cafe.cafeId, cafe.seatId));

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: 'IDEMPOTENCY_KEY_REQUIRED',
    });
  });

  it('POST /bookings duplicate idempotency key returns cached 201 without double insert', async () => {
    const { customer, cafe } = await createFixture();
    const payload = createBookingPayload(cafe.cafeId, cafe.seatId);
    const idempotencyKey = `booking-${randomUUID()}`;

    const first = await request(app)
      .post(BOOKINGS_BASE)
      .set('Authorization', `Bearer ${customer.token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    const second = await request(app)
      .post(BOOKINGS_BASE)
      .set('Authorization', `Bearer ${customer.token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.booking.id).toBe(first.body.data.booking.id);

    const count = await testPrisma.booking.count({
      where: { customerId: customer.id, cafeId: cafe.cafeId, seatId: cafe.seatId },
    });
    expect(count).toBe(1);
  });

  it('DELETE /bookings/{id} cancels a confirmed customer booking', async () => {
    const { customer, cafe } = await createFixture();
    const booking = await createConfirmedBooking(customer.id, cafe.cafeId, cafe.seatId);

    const response = await request(app)
      .delete(`${BOOKINGS_BASE}/${booking.id}`)
      .set('Authorization', `Bearer ${customer.token}`)
      .query({ reason: 'plans changed' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        booking: {
          id: booking.id,
          status: BookingStatus.CANCELLED,
        },
      },
    });

    const updated = await testPrisma.booking.findUnique({ where: { id: booking.id } });
    expect(updated?.status).toBe(BookingStatus.CANCELLED);
  });

  it('DELETE /bookings/{id} rejects cancellation after check-in', async () => {
    const { customer, cafe } = await createFixture();
    const booking = await createConfirmedBooking(
      customer.id,
      cafe.cafeId,
      cafe.seatId,
      BookingStatus.CHECKED_IN,
    );

    const response = await request(app)
      .delete(`${BOOKINGS_BASE}/${booking.id}`)
      .set('Authorization', `Bearer ${customer.token}`);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      success: false,
      error: 'BOOKING_CANNOT_CANCEL',
    });
  });

  it('POST /bookings/{id}/check-in within window returns 200 CHECKED_IN', async () => {
    const { customer, cafe } = await createFixture();
    const startTime = new Date(Date.now() + 5 * 60_000);
    const booking = await createConfirmedBooking(
      customer.id,
      cafe.cafeId,
      cafe.seatId,
      BookingStatus.CONFIRMED,
      startTime,
    );

    const response = await request(app)
      .post(`${BOOKINGS_BASE}/${booking.id}/check-in`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        booking: {
          id: booking.id,
          status: BookingStatus.CHECKED_IN,
        },
      },
    });

    const updated = await testPrisma.booking.findUnique({ where: { id: booking.id } });
    expect(updated?.status).toBe(BookingStatus.CHECKED_IN);
  });

  it('POST /bookings/{id}/check-in too early returns 422', async () => {
    const { customer, cafe } = await createFixture();
    const startTime = new Date(Date.now() + 60 * 60_000);
    const booking = await createConfirmedBooking(
      customer.id,
      cafe.cafeId,
      cafe.seatId,
      BookingStatus.CONFIRMED,
      startTime,
    );

    const response = await request(app)
      .post(`${BOOKINGS_BASE}/${booking.id}/check-in`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({});

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      success: false,
      error: 'CHECKIN_TOO_EARLY',
    });
  });
});
