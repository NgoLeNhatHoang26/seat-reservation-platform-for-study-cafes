import http from 'k6/http';
import { check, fail } from 'k6';

export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const CUSTOMER_EMAIL = __ENV.CUSTOMER_EMAIL || 'customer@example.com';
export const CUSTOMER_PASSWORD = __ENV.CUSTOMER_PASSWORD || 'Customer123!';
export const LOAD_TEST_PASSWORD = __ENV.LOAD_TEST_PASSWORD || CUSTOMER_PASSWORD;
export const LOAD_USER_COUNT = Number(__ENV.LOAD_USER_COUNT || 30);

export function loadTestUserEmail(index) {
  return `load-customer-${String(index).padStart(2, '0')}@example.com`;
}

export function jsonHeaders(extra = {}) {
  return {
    headers: {
      'Content-Type': 'application/json',
      ...extra,
    },
  };
}

export function authHeaders(accessToken, extra = {}) {
  return jsonHeaders({
    Authorization: `Bearer ${accessToken}`,
    ...extra,
  });
}

export function login(email = CUSTOMER_EMAIL, password = CUSTOMER_PASSWORD) {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    jsonHeaders(),
  );

  const ok = check(res, {
    'login returns 200': (r) => r.status === 200,
    'login returns access token': (r) =>
      r.status === 200 && Boolean(r.json('data.tokens.accessToken')),
  });

  if (!ok) {
    fail(`Login failed: status=${res.status} body=${res.body}`);
  }

  return {
    accessToken: res.json('data.tokens.accessToken'),
    refreshToken: res.json('data.tokens.refreshToken'),
  };
}

export function browseCafes(limit = 12) {
  return http.get(`${BASE_URL}/api/v1/cafes?limit=${limit}`);
}

export function getFirstCafeId() {
  if (__ENV.CAFE_ID) return __ENV.CAFE_ID;

  const res = browseCafes(12);
  const ok = check(res, {
    'browse cafes returns 200': (r) => r.status === 200,
    'browse cafes has at least one item': (r) =>
      r.status === 200 && (r.json('data.items') || []).length > 0,
  });

  if (!ok) {
    fail(`Cannot discover cafe: status=${res.status} body=${res.body}`);
  }

  return res.json('data.items.0.id');
}

export function futureSlot() {
  if (__ENV.SLOT_START && __ENV.SLOT_END) {
    return {
      startTime: __ENV.SLOT_START,
      endTime: __ENV.SLOT_END,
    };
  }

  const start = new Date();
  start.setUTCDate(start.getUTCDate() + Number(__ENV.SLOT_DAYS_AHEAD || 1));
  start.setUTCHours(Number(__ENV.SLOT_START_HOUR_UTC || 10), 0, 0, 0);

  const end = new Date(start);
  end.setUTCHours(start.getUTCHours() + Number(__ENV.SLOT_DURATION_HOURS || 2), 0, 0, 0);

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

export function getAvailability(cafeId, slot) {
  const query = `startTime=${encodeURIComponent(slot.startTime)}&endTime=${encodeURIComponent(slot.endTime)}`;
  return http.get(`${BASE_URL}/api/v1/cafes/${cafeId}/seats/availability?${query}`);
}

export function pickSeatFromAvailability(availability) {
  if (__ENV.SEAT_ID) return __ENV.SEAT_ID;

  const seats = listAvailableSeats(availability);
  if (seats.length === 0) {
    fail(`No available seat in availability response: ${availability.body}`);
  }

  return seats[0];
}

export function listAvailableSeats(availability) {
  const zones = availability.json('data.zones') || [];
  const seats = [];

  for (const zone of zones) {
    for (const seat of zone.seats || []) {
      if (seat.status === 'AVAILABLE') {
        seats.push(seat.id);
      }
    }
  }

  return seats;
}

export function pickSeatForVu(availability, vuIndex, fallbackSeatIds = []) {
  if (__ENV.SEAT_ID) return __ENV.SEAT_ID;

  const seats = listAvailableSeats(availability);
  if (seats.length > 0) {
    return seats[(vuIndex - 1) % seats.length];
  }

  if (fallbackSeatIds.length > 0) {
    return fallbackSeatIds[(vuIndex - 1) % fallbackSeatIds.length];
  }

  const zones = availability.json('data.zones') || [];
  for (const zone of zones) {
    for (const seat of zone.seats || []) {
      return seat.id;
    }
  }

  fail(`No seats in availability response: ${availability.body}`);
}

export function randomIdempotencyKey(prefix = 'k6-booking') {
  return `${prefix}-${Date.now()}-${__VU}-${__ITER}-${Math.random().toString(36).slice(2)}`;
}

export function createBooking(accessToken, cafeId, seatId, slot, idempotencyKey = randomIdempotencyKey()) {
  return http.post(
    `${BASE_URL}/api/v1/bookings`,
    JSON.stringify({
      cafeId,
      seatId,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }),
    authHeaders(accessToken, { 'Idempotency-Key': idempotencyKey }),
  );
}
